// Services/ExchangeEmailService.cs
// Handles all exchange/buyback email notifications:
//   1. Dealer ACK on case submission
//   2. Admin notification on case submission
//   3. Dealer notification on admin decision (Approved / Modified / Rejected)
//
// DealerId == dealer's email address — no extra lookup needed.
// SmtpClient is NOT thread-safe; each send creates its own instance.

using System.Net;
using System.Net.Mail;
using BGaussCRM.API.Interfaces;
using BGaussCRM.API.Models;

namespace BGaussCRM.API.Services;

public class ExchangeEmailService : IExchangeEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ExchangeEmailService> _logger;

    // Admin recipient — read from appsettings so it's configurable
    private string AdminEmail => _config["Exchange:AdminEmail"] ?? "mayank.maheshwari@bgauss.com";
    private const string AdminName = "Mayank Maheshwari";

    public ExchangeEmailService(IConfiguration config, ILogger<ExchangeEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    // ── SMTP factory — fresh instance per call ────────────────────────────────
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

    private string From   => _config["Smtp:From"] ?? _config["Smtp:User"] ?? "exchange@bgauss.com";
    private string AppUrl => _config["AppUrl"] ?? "https://bgauss.com";

    // ═════════════════════════════════════════════════════════════════════════
    // PUBLIC — called from controllers
    // ═════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Triggered by Submit().
    /// DealerId == dealerEmail — passed directly, no lookup required.
    /// Sends sequentially: dealer ACK first, then admin notification.
    /// </summary>
    public async Task SendCaseSubmissionEmailsAsync(ExchangeCase c, string dealerEmail)
    {
        await SendDealerAckAsync(c, dealerEmail);
        await SendAdminNotificationAsync(c, dealerEmail);
    }

    /// <summary>
    /// Triggered by AdminAction() and DecideCase().
    /// Sends a single decision email (Approved / Modified / Rejected) to the dealer.
    /// </summary>
    public async Task SendAdminActionEmailAsync(ExchangeCase c, string dealerEmail, string action, string? note)
    {
        if (string.IsNullOrWhiteSpace(dealerEmail))
        {
            _logger.LogWarning("Empty dealer email — skipping decision email for {Code}", c.CaseNumber);
            return;
        }

        try
        {
            using var client = BuildClient();

            var (subject, accent, heading) = action switch
            {
                "Approved" => (
                    $"[BGauss Exchange] ✅ Case Approved — {c.CaseNumber}",
                    "#16A34A",
                    "✅ Exchange Case Approved"),
                "Modified" => (
                    $"[BGauss Exchange] 🔄 Price Modified — {c.CaseNumber}",
                    "#D97706",
                    "🔄 Exchange Case — Price Modified by Admin"),
                _ => (
                    $"[BGauss Exchange] ❌ Case Rejected — {c.CaseNumber}",
                    "#DC2626",
                    "❌ Exchange Case Rejected"),
            };

            var mail = new MailMessage(From, dealerEmail, subject,
                DecisionHtml(c, dealerEmail, action, note, accent, heading))
            { IsBodyHtml = true };

            await client.SendMailAsync(mail);
            _logger.LogInformation(
                "Decision ({Action}) email sent to {Email} for {Code}", action, dealerEmail, c.CaseNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send decision email for {Code}", c.CaseNumber);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE SENDERS
    // ═════════════════════════════════════════════════════════════════════════

    private async Task SendDealerAckAsync(ExchangeCase c, string dealerEmail)
    {
        if (string.IsNullOrWhiteSpace(dealerEmail))
        {
            _logger.LogWarning("Empty dealer email — skipping ACK for {Code}", c.CaseNumber);
            return;
        }
        try
        {
            using var client = BuildClient();
            var mail = new MailMessage(From, dealerEmail,
                $"[BGauss Exchange] Case Submitted — {c.CaseNumber}",
                DealerAckHtml(c, dealerEmail))
            { IsBodyHtml = true };
            await client.SendMailAsync(mail);
            _logger.LogInformation("Exchange ACK sent to {Email} for {Code}", dealerEmail, c.CaseNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send dealer ACK for {Code}", c.CaseNumber);
        }
    }

    private async Task SendAdminNotificationAsync(ExchangeCase c, string dealerEmail)
    {
        try
        {
            using var client = BuildClient();
            var mail = new MailMessage(From, AdminEmail,
                $"[BGauss Exchange] Review Required — {c.CaseNumber} | {dealerEmail}",
                AdminNotificationHtml(c, dealerEmail))
            { IsBodyHtml = true };
            mail.CC.Add(new MailAddress(From, "BGauss Exchange System"));
            await client.SendMailAsync(mail);
            _logger.LogInformation(
                "Exchange review request sent to {Admin} for {Code}", AdminEmail, c.CaseNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send admin notification for {Code}", c.CaseNumber);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HTML HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private static string H(string? s)        => WebUtility.HtmlEncode(s ?? "");
    private static string Fmt(decimal? price) => price.HasValue ? $"&#8377; {price.Value:N0}" : "—";

    private static string Row(string label, string value) => $"""
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:185px;vertical-align:top;font-size:13px">{label}</td>
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
                         border-top:1px solid #e2e8f0">
              BGauss Exchange &amp; Buyback System &nbsp;·&nbsp; Auto-generated &nbsp;·&nbsp; Do not reply
            </div>
          </div>
        </body></html>
        """;

    private string InfoBox(string bg, string border, string color, string text) =>
        $"""
        <div style="margin-top:20px;padding:14px 18px;background:{bg};border:1px solid {border};
                    border-radius:8px;font-size:13px;color:{color}">
          {text}
        </div>
        """;

    private string CTA(string path, string label, string color) =>
        $"""
        <a href="{AppUrl}{path}"
           style="display:inline-block;background:{color};color:#fff;padding:11px 22px;
                  border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          {label}
        </a>
        """;

    // ═════════════════════════════════════════════════════════════════════════
    // TEMPLATES
    // ═════════════════════════════════════════════════════════════════════════

    // ── 1. Dealer ACK ─────────────────────────────────────────────────────────
    private string DealerAckHtml(ExchangeCase c, string dealerEmail) =>
        Wrap("#1D4ED8", "Exchange Case Submitted", $"""
            <p style="margin:0 0 20px;color:#374151;font-size:14px">
              Hi <strong>{H(dealerEmail)}</strong>,<br/>
              Your exchange case has been submitted and is now <strong>pending Admin review</strong>.
              You will receive an email once a decision is made.
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
                "ℹ The system-generated price range has been forwarded to Admin. " +
                "Prices <strong>cannot be modified</strong> by dealers.")}
            <div style="margin-top:24px">
              {CTA($"/exchange/cases/{c.Id}", "View Case →", "#1D4ED8")}
            </div>
            """);

    // ── 2. Admin notification ─────────────────────────────────────────────────
    private string AdminNotificationHtml(ExchangeCase c, string dealerEmail) =>
        Wrap("#D97706", $"Review Required — {c.CaseNumber}", $"""
            <p style="margin:0 0 20px;color:#374151;font-size:14px">
              Hi <strong>{AdminName}</strong>,<br/>
              A new exchange case from dealer <strong>{H(dealerEmail)}</strong>
              requires your review and price decision.
            </p>
            <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0">
              {Row("Case Number",      H(c.CaseNumber))}
              {Row("Dealer",           H(dealerEmail))}
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
            <p style="margin:20px 0 8px;font-weight:600;font-size:14px;color:#0f172a">Action Required</p>
            <p style="margin:0 0 20px;font-size:13px;color:#6b7280">
              Review the inspection scores, uploaded photos and system price in the portal,
              then approve, modify, or reject with remarks.
            </p>
            <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
              {CTA($"/admin/exchange/{c.Id}", "✅ Approve",       "#16A34A")}
              {CTA($"/admin/exchange/{c.Id}", "🔄 Modify Price",  "#D97706")}
              {CTA($"/admin/exchange/{c.Id}", "❌ Reject",        "#DC2626")}
            </div>
            """);

    // ── 3. Decision → dealer ──────────────────────────────────────────────────
    private string DecisionHtml(ExchangeCase c, string dealerEmail,
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
                "❌ This case has been rejected. Review the admin remarks below and contact " +
                "BGauss if you have questions."),
        };

        return Wrap(accent, heading, $"""
            <p style="margin:0 0 20px;color:#374151;font-size:14px">
              Hi <strong>{H(dealerEmail)}</strong>,<br/>{intro}
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
                        $"<span style=\"color:{accent};font-size:15px\">{Fmt(c.ApprovedPrice)}</span>")
                  : "")}
              {Row("Status",             H(c.Status))}
              {Row("Decision At",        (c.AdminActionAt ?? DateTime.UtcNow).ToString("dd MMM yyyy, hh:mm tt") + " UTC")}
              {(string.IsNullOrWhiteSpace(note) ? "" : Row("Admin Remarks", H(note)))}
            </table>
            {banner}
            <div style="margin-top:24px">
              {CTA($"/exchange/cases/{c.Id}", "View Case →", accent)}
            </div>
            """);
    }
}