// Services/ExchangeEmailService.cs
//
// EMAIL FLOW:
//   SMTP AUTH  : priyanka.nikam@bgauss.com  (fixed Office365 credentials — never changes)
//   FROM       : BGauss Exchange <priyanka.nikam@bgauss.com>  (must match SMTP auth for Office365)
//   REPLY-TO   : dealer.Email  (so admin/dealer can reply to the right person)
//
//   ┌─────────────────────────────────────────────────────────────────┐
//   │  Email Type          │  TO                    │  REPLY-TO       │
//   ├─────────────────────────────────────────────────────────────────┤
//   │  Dealer ACK          │  dealer.Email (DB)     │  AdminEmail     │
//   │  Admin Notification  │  AdminEmail            │  dealer.Email   │
//   │  Decision to dealer  │  dealer.Email (DB)     │  AdminEmail     │
//   └─────────────────────────────────────────────────────────────────┘
//
//   dealer.Email is resolved from the Users table by UserId JWT claim.
//   Example: Karan Mehta logs in → DB Email = priyankanikam12101@gmail.com
//            → ALL dealer emails go TO priyankanikam12101@gmail.com
//            → Admin sees "Hi Admin, case from Karan Mehta (priyankanikam12101@gmail.com)"

using System.Net;
using System.Net.Mail;
using BGaussCRM.API.Interfaces;
using BGaussCRM.API.Models;

namespace BGaussCRM.API.Services;

public class ExchangeEmailService : IExchangeEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ExchangeEmailService> _logger;

    // Admin email from appsettings → Exchange:AdminEmail
    private string AdminEmail => _config["Exchange:AdminEmail"] ?? "priyanka.nikam@bgauss.com";
    private const string AdminName = "Admin";

    public ExchangeEmailService(IConfiguration config, ILogger<ExchangeEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    // ── SMTP factory ── always authenticates as priyanka.nikam@bgauss.com ────
    private SmtpClient BuildClient()
    {
        var s = _config.GetSection("Smtp");
        return new SmtpClient(s["Host"], int.Parse(s["Port"] ?? "587"))
        {
            Credentials    = new NetworkCredential(s["User"], s["Password"]),
            EnableSsl      = true,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };
    }

    // ── FROM address: always the SMTP auth account ────────────────────────────
    // Office365 requires From == authenticated user for external (Gmail etc.) recipients.
    // We use a friendly display name so emails look professional.
    private MailAddress FromAddress =>
        new MailAddress(
            _config["Smtp:User"] ?? "priyanka.nikam@bgauss.com",
            "BGauss Exchange"
        );

    // ── AppUrl for deep-link buttons ──────────────────────────────────────────
    private string AppUrl => (_config["AppUrl"] ?? "http://34.203.61.70").TrimEnd('/');

    // ── Validate that dealer has a real email address ─────────────────────────
    private static bool HasValidEmail(User dealer) =>
        !string.IsNullOrWhiteSpace(dealer.Email) && dealer.Email.Contains("@");

    // ═════════════════════════════════════════════════════════════════════════
    // PUBLIC INTERFACE
    // ═════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Called when dealer submits a case.
    /// Sends ACK to dealer + notification to admin.
    /// </summary>
    public async Task SendCaseSubmissionEmailsAsync(ExchangeCase c, User dealer)
    {
        await SendDealerAckAsync(c, dealer);
        await SendAdminNotificationAsync(c, dealer);
    }

    /// <summary>
    /// Called when admin approves / modifies / rejects.
    /// Sends decision email TO dealer's registered DB email.
    /// </summary>
    public async Task SendAdminActionEmailAsync(ExchangeCase c, User dealer, string action, string? note)
    {
        if (!HasValidEmail(dealer))
        {
            _logger.LogWarning(
                "Skipping decision email for {Code} — dealer has no valid email (UserId={UserId})",
                c.CaseNumber, dealer.UserId);
            return;
        }

        try
        {
            using var client = BuildClient();

            var (subject, accent, heading) = action switch
            {
                "Approved" => (
                    $"[BGauss Exchange] ✅ Case Approved — {c.CaseNumber}",
                    "#16A34A", "✅ Exchange Case Approved"),
                "Modified" => (
                    $"[BGauss Exchange] 🔄 Price Modified — {c.CaseNumber}",
                    "#D97706", "🔄 Exchange Case — Price Modified by Admin"),
                _ => (
                    $"[BGauss Exchange] ❌ Case Rejected — {c.CaseNumber}",
                    "#DC2626", "❌ Exchange Case Rejected"),
            };

            var mail = new MailMessage
            {
                From       = FromAddress,                  // priyanka.nikam@bgauss.com
                Subject    = subject,
                Body       = DecisionHtml(c, dealer, action, note, accent, heading),
                IsBodyHtml = true,
            };

            // ▶ TO: dealer's actual registered email (e.g. priyankanikam12101@gmail.com)
            mail.To.Add(new MailAddress(dealer.Email, dealer.FullName));

            // Reply-To: admin, so dealer can reply back to admin
            mail.ReplyToList.Add(new MailAddress(AdminEmail, "BGauss Exchange Admin"));

            await client.SendMailAsync(mail);

            _logger.LogInformation(
                "✅ Decision ({Action}) email sent → TO: {Email} ({FullName}) | Case: {Code}",
                action, dealer.Email, dealer.FullName, c.CaseNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "❌ Failed to send decision email to {Email} for case {Code}",
                dealer.Email, c.CaseNumber);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE SENDERS
    // ═════════════════════════════════════════════════════════════════════════

    // ── 1. Dealer ACK ─────────────────────────────────────────────────────────
    // FROM  : priyanka.nikam@bgauss.com  (SMTP auth)
    // TO    : dealer.Email from DB  (e.g. priyankanikam12101@gmail.com)
    // REPLY : AdminEmail  (so dealer replies to admin)
    private async Task SendDealerAckAsync(ExchangeCase c, User dealer)
    {
        if (!HasValidEmail(dealer))
        {
            _logger.LogWarning(
                "Skipping dealer ACK for {Code} — no valid email for {FullName}",
                c.CaseNumber, dealer.FullName);
            return;
        }

        try
        {
            using var client = BuildClient();

            var mail = new MailMessage
            {
                From       = FromAddress,
                Subject    = $"[BGauss Exchange] ✅ Case Submitted — {c.CaseNumber}",
                Body       = DealerAckHtml(c, dealer),
                IsBodyHtml = true,
            };

            // ▶ TO: dealer's DB email
            mail.To.Add(new MailAddress(dealer.Email, dealer.FullName));

            // Reply-To admin so dealer's reply reaches admin
            mail.ReplyToList.Add(new MailAddress(AdminEmail, "BGauss Exchange Admin"));

            await client.SendMailAsync(mail);

            _logger.LogInformation(
                "✅ ACK email sent → TO: {Email} ({FullName}) | Case: {Code}",
                dealer.Email, dealer.FullName, c.CaseNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "❌ Failed to send ACK email to {Email} for case {Code}",
                dealer.Email, c.CaseNumber);
        }
    }

    // ── 2. Admin notification ─────────────────────────────────────────────────
    // FROM  : priyanka.nikam@bgauss.com  (SMTP auth)
    // TO    : AdminEmail (priyanka.nikam@bgauss.com)
    // REPLY : dealer.Email  (so admin can reply directly to dealer)
    private async Task SendAdminNotificationAsync(ExchangeCase c, User dealer)
    {
        try
        {
            using var client = BuildClient();

            var mail = new MailMessage
            {
                From       = FromAddress,
                Subject    = $"[BGauss Exchange] ⚡ Action Required — {c.CaseNumber} | {dealer.FullName}",
                Body       = AdminNotificationHtml(c, dealer),
                IsBodyHtml = true,
            };

            // ▶ TO: admin
            mail.To.Add(new MailAddress(AdminEmail, "BGauss Exchange Admin"));

            // Reply-To dealer — admin clicks Reply and goes straight to dealer
            if (HasValidEmail(dealer))
                mail.ReplyToList.Add(new MailAddress(dealer.Email, dealer.FullName));

            await client.SendMailAsync(mail);

            _logger.LogInformation(
                "✅ Admin notification sent → TO: {Admin} | Dealer: {FullName} <{Email}> | Case: {Code}",
                AdminEmail, dealer.FullName, dealer.Email, c.CaseNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "❌ Failed to send admin notification for case {Code}", c.CaseNumber);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HTML HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private static string H(string? s)        => WebUtility.HtmlEncode(s ?? "");
    private static string Fmt(decimal? price) => price.HasValue ? $"&#8377;&nbsp;{price.Value:N0}" : "—";

    private static string Row(string label, string value) => $"""
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:190px;vertical-align:top;font-size:13px">{label}</td>
          <td style="padding:8px 0;font-weight:600;color:#0f172a;font-size:13px">{value}</td>
        </tr>
        """;

    private static string Wrap(string accent, string heading, string body) => $"""
        <html><body style="margin:0;padding:20px;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
          <div style="max-width:640px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;
                      border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.07)">
            <div style="background:{accent};padding:28px 32px">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.8);font-size:11px;
                         letter-spacing:1px;text-transform:uppercase">
                BGauss Exchange &amp; Buyback Program
              </p>
              <h2 style="margin:0;color:#fff;font-size:20px;font-weight:700">{heading}</h2>
            </div>
            <div style="padding:28px 32px">{body}</div>
            <div style="background:#f8fafc;padding:14px 32px;font-size:11px;color:#94a3b8;
                         border-top:1px solid #e2e8f0;text-align:center">
              BGauss Exchange &amp; Buyback System &nbsp;·&nbsp; Auto-generated &nbsp;·&nbsp; Do not reply
            </div>
          </div>
        </body></html>
        """;

    private static string InfoBox(string bg, string border, string color, string text) =>
        $"""
        <div style="margin-top:20px;padding:14px 18px;background:{bg};border:1px solid {border};
                    border-radius:8px;font-size:13px;color:{color}">
          {text}
        </div>
        """;

    // Deep-link button — opens admin portal with ?caseId=N&action=X pre-selected
    private string ActionBtn(int caseId, string action, string label, string bg, string emoji) =>
        $"""
        <a href="{AppUrl}/exchange-admin?caseId={caseId}&action={WebUtility.UrlEncode(action)}"
           style="display:inline-block;background:{bg};color:#fff;padding:12px 22px;margin:4px 6px 4px 0;
                  border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;
                  letter-spacing:0.2px;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
          {emoji} {label}
        </a>
        """;

    private string CTA(string path, string label, string color) =>
        $"""
        <a href="{AppUrl}{path}"
           style="display:inline-block;background:{color};color:#fff;padding:11px 24px;
                  border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          {label}
        </a>
        """;

    // ═════════════════════════════════════════════════════════════════════════
    // EMAIL TEMPLATES
    // ═════════════════════════════════════════════════════════════════════════

    // ── 1. Dealer ACK — sent TO dealer's DB email, greets by FullName ─────────
    private string DealerAckHtml(ExchangeCase c, User dealer) =>
        Wrap("#1D4ED8", "Exchange Case Submitted", $"""
            <p style="margin:0 0 4px;color:#6b7280;font-size:12px">
              Sent to: <strong>{H(dealer.Email)}</strong>
            </p>
            <p style="margin:0 0 20px;color:#374151;font-size:14px">
              Hi <strong>{H(dealer.FullName)}</strong>,<br/><br/>
              Your exchange case has been successfully submitted and is now
              <strong>pending Admin review</strong>.
              You will receive another email at this address once a decision is made.
            </p>

            <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0">
              {Row("Case Number",      H(c.CaseNumber))}
              {Row("Customer Name",    H(c.CustomerName))}
              {Row("Mobile",           H(c.MobileNumber))}
              {Row("City",             H(c.City))}
              {Row("Vehicle Model",    H(c.VehicleModel))}
              {Row("Registration No.", H(c.RegistrationNo))}
              {Row("Year of Purchase", c.YearOfPurchase.ToString())}
              {Row("KM Driven",        $"{c.KmDriven:N0} km")}
              {Row("Inspection Grade", H(c.Grade))}
              {Row("Total Score",      c.TotalScore.HasValue ? $"{c.TotalScore:F1} / 10" : "—")}
              {Row("Price Range",      $"{Fmt(c.MinPrice)} – {Fmt(c.MaxPrice)}")}
              {Row("Recommended",      Fmt(c.RecommendedPrice))}
              {Row("Submitted At",     (c.SubmittedAt ?? DateTime.UtcNow).ToString("dd MMM yyyy, hh:mm tt") + " UTC")}
            </table>

            {InfoBox("#eff6ff", "#bfdbfe", "#1e40af",
                "ℹ️ The system-generated price range has been forwarded to Admin for review. " +
                "Prices <strong>cannot be modified</strong> by dealers.")}

            <div style="margin-top:24px">
              {CTA($"/exchange/cases/{c.Id}", "View Case →", "#1D4ED8")}
            </div>
            """);

    // ── 2. Admin notification — TO admin, shows full dealer info ──────────────
    private string AdminNotificationHtml(ExchangeCase c, User dealer) =>
        Wrap("#D97706", $"⚡ Action Required — {c.CaseNumber}", $"""
            <p style="margin:0 0 6px;color:#374151;font-size:14px">
              Hi <strong>{AdminName}</strong>,
            </p>
            <p style="margin:0 0 20px;color:#374151;font-size:14px">
              A new exchange case submitted by dealer
              <strong>{H(dealer.FullName)}</strong>
              requires your decision. Use the action buttons below to respond directly
              from this email — no login search needed.
            </p>

            <!-- ── Dealer Info Card ── -->
            <div style="margin-bottom:24px;padding:16px 20px;background:#f0f9ff;
                        border:1px solid #bae6fd;border-radius:10px">
              <p style="margin:0 0 10px;font-weight:700;font-size:11px;
                         letter-spacing:0.8px;text-transform:uppercase;color:#0369a1">
                👤 Dealer Information
              </p>
              <table style="width:100%;border-collapse:collapse">
                {Row("Full Name",   H(dealer.FullName))}
                {Row("Email",       $"<a href='mailto:{H(dealer.Email)}' style='color:#1d4ed8'>{H(dealer.Email)}</a>")}
                {Row("Phone",       H(dealer.PhoneNumber ?? "—"))}
                {Row("Employee ID", H(dealer.EmployeeId  ?? "—"))}
                {Row("Department",  H(dealer.Department  ?? "—"))}
              </table>
            </div>

            <!-- ── Case Details ── -->
            <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0">
              {Row("Case Number",      H(c.CaseNumber))}
              {Row("Customer Name",    H(c.CustomerName))}
              {Row("Mobile",           H(c.MobileNumber))}
              {Row("City",             H(c.City))}
              {Row("Vehicle Model",    H(c.VehicleModel))}
              {Row("Registration No.", H(c.RegistrationNo))}
              {Row("Year of Purchase", c.YearOfPurchase.ToString())}
              {Row("KM Driven",        $"{c.KmDriven:N0} km")}
              {Row("Inspection Grade", H(c.Grade))}
              {Row("Total Score",      c.TotalScore.HasValue ? $"{c.TotalScore:F1} / 10" : "—")}
              {Row("Min Price",        Fmt(c.MinPrice))}
              {Row("Recommended",      Fmt(c.RecommendedPrice))}
              {Row("Max Price",        Fmt(c.MaxPrice))}
              {Row("Submitted At",     (c.SubmittedAt ?? DateTime.UtcNow).ToString("dd MMM yyyy, hh:mm tt") + " UTC")}
            </table>

            <!-- ── One-Click Action Buttons ── -->
            <div style="margin-top:28px;padding:20px;background:#f8fafc;border-radius:10px;
                        border:1px solid #e2e8f0">
              <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#0f172a">
                ⚡ Take Action Directly
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:#6b7280">
                Click a button to open the admin portal with this case and action pre-selected.
                You must be logged in (browser session is remembered).
              </p>
              <div>
                {ActionBtn(c.Id, "Approved", "Approve Case", "#16A34A", "✅")}
                {ActionBtn(c.Id, "Modified", "Modify Price", "#D97706", "✏️")}
                {ActionBtn(c.Id, "Rejected", "Reject Case",  "#DC2626", "❌")}
              </div>
              <p style="margin:16px 0 0;font-size:11px;color:#94a3b8">
                Or
                <a href="{AppUrl}/exchange-admin?caseId={c.Id}"
                   style="color:#1d4ed8;text-decoration:none">
                  open case without pre-selecting an action →
                </a>
              </p>
            </div>
            """);

    // ── 3. Decision email — TO dealer's DB email, greets by FullName ──────────
    private string DecisionHtml(ExchangeCase c, User dealer,
                                string action, string? note,
                                string accent, string heading)
    {
        var intro = action switch
        {
            "Approved" =>
                $"Your exchange case <strong>{H(c.CaseNumber)}</strong> has been " +
                $"<strong style=\"color:#16A34A\">approved</strong> by Admin.",
            "Modified" =>
                $"Your exchange case <strong>{H(c.CaseNumber)}</strong> has been reviewed. " +
                $"Admin has <strong style=\"color:#D97706\">modified the approved price</strong>.",
            _ =>
                $"Your exchange case <strong>{H(c.CaseNumber)}</strong> has been " +
                $"<strong style=\"color:#DC2626\">rejected</strong> by Admin.",
        };

        var banner = action switch
        {
            "Approved" => InfoBox("#f0fdf4", "#bbf7d0", "#166534",
                $"✅ Case approved. Proceed with the vehicle exchange at the approved price of " +
                $"<strong>{Fmt(c.ApprovedPrice)}</strong>."),
            "Modified" => InfoBox("#fefce8", "#fde68a", "#92400e",
                $"🔄 Admin has set a modified price of <strong>{Fmt(c.ApprovedPrice)}</strong>. " +
                $"Use this price for the transaction."),
            _ => InfoBox("#fef2f2", "#fecaca", "#991b1b",
                "❌ This case has been rejected. Review the admin remarks below and " +
                "contact BGauss if you have questions."),
        };

        return Wrap(accent, heading, $"""
            <p style="margin:0 0 4px;color:#6b7280;font-size:12px">
              Sent to: <strong>{H(dealer.Email)}</strong>
            </p>
            <p style="margin:0 0 20px;color:#374151;font-size:14px">
              Hi <strong>{H(dealer.FullName)}</strong>,<br/><br/>
              {intro}
            </p>

            <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0">
              {Row("Case Number",        H(c.CaseNumber))}
              {Row("Customer Name",      H(c.CustomerName))}
              {Row("Vehicle Model",      H(c.VehicleModel))}
              {Row("Registration No.",   H(c.RegistrationNo))}
              {Row("Inspection Grade",   H(c.Grade))}
              {Row("Total Score",        c.TotalScore.HasValue ? $"{c.TotalScore:F1} / 10" : "—")}
              {Row("System Min",         Fmt(c.MinPrice))}
              {Row("System Recommended", Fmt(c.RecommendedPrice))}
              {Row("System Max",         Fmt(c.MaxPrice))}
              {(action != "Rejected"
                  ? Row("Admin Approved Price",
                        $"<span style=\"color:{accent};font-size:16px;font-weight:800\">" +
                        $"{Fmt(c.ApprovedPrice)}</span>")
                  : "")}
              {Row("Status",             H(c.Status))}
              {Row("Decision At",
                   (c.AdminActionAt ?? DateTime.UtcNow).ToString("dd MMM yyyy, hh:mm tt") + " UTC")}
              {(string.IsNullOrWhiteSpace(note) ? "" : Row("Admin Remarks", H(note)))}
            </table>

            {banner}

            <div style="margin-top:24px">
              {CTA($"/exchange/cases/{c.Id}", "View Case →", accent)}
            </div>
            """);
    }
}