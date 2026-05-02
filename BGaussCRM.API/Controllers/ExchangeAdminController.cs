// Controllers/ExchangeAdminController.cs
// CHANGES vs original:
//   • IExchangeEmailService injected
//   • DecideCase(): fire SendAdminActionEmailAsync after SaveChanges (non-blocking)
//     DealerId == dealer email — no extra lookup needed

using BGaussCRM.API.Data;
using BGaussCRM.API.DTOs;
using BGaussCRM.API.Interfaces;
using BGaussCRM.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BGaussCRM.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExchangeAdminController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IExchangeEmailService _email;            // ← NEW
        private readonly ILogger<ExchangeAdminController> _logger; // ← NEW
        private readonly IConfiguration _config;

        public ExchangeAdminController(
            AppDbContext db,
            IExchangeEmailService email,                          // ← NEW
            ILogger<ExchangeAdminController> logger,
            IConfiguration config)             // ← NEW
        {
            _db     = db;
            _email  = email;
            _logger = logger;
            _config = config;
        }

        private string AdminUser => User.Identity?.Name
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? "admin";

        // ── GET /api/ExchangeAdmin/dashboard-stats ────────────────────────────
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var cases = await _db.ExchangeCases.ToListAsync();

            var recentActivity = await _db.ExchangeAdminActions
                .Include(a => a.Case)
                .OrderByDescending(a => a.ActionAt)
                .Take(10)
                .Select(a => new
                {
                    a.CaseId,
                    CaseNumber = a.Case.CaseNumber,
                    a.Action, a.AdminUser, a.ActionAt, a.PriceSet,
                })
                .ToListAsync();

            return Ok(new
            {
                Total          = cases.Count,
                Pending        = cases.Count(c => c.Status == "PendingAdminReview"),
                Approved       = cases.Count(c => c.Status == "AdminApproved" || c.Status == "AdminModified"),
                Rejected       = cases.Count(c => c.Status == "AdminRejected"),
                Draft          = cases.Count(c => c.Status == "Draft"),
                ThisWeek       = cases.Count(c => c.CreatedAt >= DateTime.UtcNow.AddDays(-7)),
                RecentActivity = recentActivity,
            });
        }

        // ── GET /api/ExchangeAdmin/queue ──────────────────────────────────────
        [HttpGet("queue")]
        public async Task<IActionResult> GetQueue(
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? sortBy   = "SubmittedAt",
            [FromQuery] string? sortDir  = "desc",
            [FromQuery] int     page     = 1,
            [FromQuery] int     pageSize = 15)
        {
            var q = _db.ExchangeCases.AsQueryable();

            if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status == status);
            if (!string.IsNullOrEmpty(search))
                q = q.Where(c => c.CaseNumber.Contains(search) || c.CustomerName.Contains(search) ||
                                 c.VehicleModel.Contains(search) || c.RegistrationNo.Contains(search) ||
                                 c.DealerId.Contains(search));

            q = sortBy switch
            {
                "CustomerName" => sortDir == "asc" ? q.OrderBy(c => c.CustomerName)  : q.OrderByDescending(c => c.CustomerName),
                "VehicleModel" => sortDir == "asc" ? q.OrderBy(c => c.VehicleModel)  : q.OrderByDescending(c => c.VehicleModel),
                "Grade"        => sortDir == "asc" ? q.OrderBy(c => c.Grade)          : q.OrderByDescending(c => c.Grade),
                "TotalScore"   => sortDir == "asc" ? q.OrderBy(c => c.TotalScore)     : q.OrderByDescending(c => c.TotalScore),
                _              => sortDir == "asc" ? q.OrderBy(c => c.SubmittedAt)    : q.OrderByDescending(c => c.SubmittedAt),
            };

            var total = await q.CountAsync();
            var items = await q.Skip((page - 1) * pageSize).Take(pageSize)
                .Select(c => new
                {
                    c.Id, c.CaseNumber, c.CustomerName, c.MobileNumber, c.City,
                    c.VehicleModel, c.RegistrationNo, c.YearOfPurchase, c.KmDriven,
                    c.Grade, c.TotalScore, c.RecommendedPrice, c.MinPrice, c.MaxPrice,
                    c.Status, c.DealerId, c.SubmittedAt, c.CreatedAt, c.ApprovedPrice,
                    ImageCount = c.ExchangeCaseImages.Count,
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // ── GET /api/ExchangeAdmin/cases/{id} ─────────────────────────────────
        [HttpGet("cases/{id}")]
        public async Task<IActionResult> GetCaseDetail(int id)
        {
            var c = await _db.ExchangeCases
                .Include(x => x.ExchangeInspectionScores)
                .Include(x => x.ExchangeCaseImages)
                .Include(x => x.ExchangeAdminActions)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return NotFound();

            var scores = c.ExchangeInspectionScores ?? Enumerable.Empty<ExchangeInspectionScore>();
            var scoresByCategory = scores.GroupBy(s => s.Category)
                .Select(g => new { Category = g.Key, Parameters = g.Select(s => new { s.Parameter, s.Score }).ToList(),
                    Average = g.Any() ? g.Average(s => (double)s.Score) : 0.0 }).ToList();

            var images = (c.ExchangeCaseImages ?? Enumerable.Empty<ExchangeCaseImage>())
                .Select(i => new { i.ImageType, i.ImagePath, i.UploadedAt }).ToList();

            var adminActions = (c.ExchangeAdminActions ?? Enumerable.Empty<ExchangeAdminAction>())
                .OrderByDescending(a => a.ActionAt)
                .Select(a => new { a.Action, a.AdminUser, a.ActionAt, a.PriceSet, a.Note }).ToList();

            return Ok(new
            {
                c.Id, c.CaseNumber, c.CustomerName, c.MobileNumber, c.City,
                c.VehicleModel, c.RegistrationNo, c.YearOfPurchase, c.KmDriven,
                c.Grade, c.TotalScore, c.RecommendedPrice, c.MinPrice, c.MaxPrice,
                c.Status, c.DealerId, c.SubmittedAt, c.CreatedAt,
                c.AdminNote, c.ApprovedPrice, c.AdminActionAt,
                ScoresByCategory = scoresByCategory,
                Images           = images,
                AdminActions     = adminActions,
            });
        }

        // ── GET /api/ExchangeAdmin/cases/{id}/images ──────────────────────────
        [HttpGet("cases/{id}/images")]
        public async Task<IActionResult> GetCaseImages(int id)
        {
            var images = await _db.ExchangeCaseImages.Where(i => i.CaseId == id)
                .Select(i => new { i.ImageType, i.ImagePath, i.UploadedAt }).ToListAsync();
            return Ok(images);
        }

        [HttpPost("cases/{id}/decide")]
        public async Task<IActionResult> DecideCase(int id, [FromBody] AdminDecisionDto dto)
        {
            var c = await _db.ExchangeCases.FindAsync(id);
            if (c == null) return NotFound();

            if (c.Status != "PendingAdminReview")
                return BadRequest(new { error = "Case is not pending review." });

            // ── Validate action ─────────────────────
            var validActions = new[] { "Approved", "Modified", "Rejected" };
            if (!validActions.Contains(dto.Action))
                return BadRequest("Invalid action");

            if (dto.Action == "Rejected" && string.IsNullOrWhiteSpace(dto.Note))
                return BadRequest("Rejection reason required");

            if (dto.Action == "Modified" && dto.Price == null)
                return BadRequest("Modified price required");

            // ── Update case ─────────────────────────
            c.Status = dto.Action switch
            {
                "Approved" => "AdminApproved",
                "Modified" => "AdminModified",
                _          => "AdminRejected"
            };

            c.ApprovedPrice = dto.Action switch
            {
                "Approved" => c.RecommendedPrice,
                "Modified" => dto.Price,
                _          => null
            };

            c.AdminNote     = dto.Note;
            c.AdminActionAt = DateTime.UtcNow;
            c.UpdatedAt     = DateTime.UtcNow;

            // ── Save logs ───────────────────────────
            _db.ExchangeAdminActions.Add(new ExchangeAdminAction
            {
                CaseId    = id,
                AdminUser = User.Identity?.Name ?? "admin",
                Action    = dto.Action,
                PriceSet  = c.ApprovedPrice,
                Note      = dto.Note
            });

            _db.ExchangeNotificationLogs.Add(new ExchangeNotificationLog
            {
                CaseId     = id,
                DealerId   = c.DealerId,
                ActionType = dto.Action,
                Message    = $"Case {c.CaseNumber} {dto.Action}"
            });

            await _db.SaveChangesAsync();

            // ── EMAIL SECTION (FIXED) ─────────────────────

            var dealerEmail = c.DealerId;

            // ❗ Validate email
            if (string.IsNullOrWhiteSpace(dealerEmail) || !dealerEmail.Contains("@"))
            {
                _logger.LogWarning("❌ Invalid dealer email: {Email}", dealerEmail);

                // TEMP fallback for testing
                dealerEmail = "mayank.maheshwari@bgauss.com";
            }

            try
            {
                _logger.LogInformation("📧 Sending email to dealer: {Email}", dealerEmail);

                await _email.SendAdminActionEmailAsync(c, dealerEmail, dto.Action, dto.Note);

                // ✅ Send to admin also
                var adminEmail = _config["Exchange:AdminEmail"];

                if (!string.IsNullOrWhiteSpace(adminEmail))
                {
                    _logger.LogInformation("📧 Sending email to admin: {Email}", adminEmail);

                    await _email.SendAdminActionEmailAsync(c, adminEmail, dto.Action, dto.Note);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Email failed for case {CaseNumber}", c.CaseNumber);
            }

            return Ok(new
            {
                c.CaseNumber,
                c.Status,
                c.ApprovedPrice
            });
        }

        // ── GET /api/ExchangeAdmin/notifications ──────────────────────────────
        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] int     page     = 1,
            [FromQuery] int     pageSize = 30,
            [FromQuery] string? dealerId = null)
        {
            var q = _db.ExchangeNotificationLogs.Include(n => n.Case).AsQueryable();
            if (!string.IsNullOrEmpty(dealerId)) q = q.Where(n => n.DealerId == dealerId);

            var total = await q.CountAsync();
            var items = await q.OrderByDescending(n => n.SentAt).Skip((page - 1) * pageSize).Take(pageSize)
                .Select(n => new
                {
                    n.Id, n.CaseId, CaseNumber = n.Case.CaseNumber,
                    n.DealerId, n.ActionType, n.Message, n.SentAt, n.IsRead,
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // ── PATCH /api/ExchangeAdmin/notifications/{id}/read ──────────────────
        [HttpPatch("notifications/{id}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            var n = await _db.ExchangeNotificationLogs.FindAsync(id);
            if (n == null) return NotFound();
            n.IsRead = true;
            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}