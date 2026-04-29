// ═══════════════════════════════════════════════════════════════
// FILE: Controllers/ExchangeAdminController.cs
// Module 2 — Admin Approval Panel (A01–A11)
// ═══════════════════════════════════════════════════════════════
using BGaussCRM.API.Data;
using BGaussCRM.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BGaussCRM.API.DTOs;

namespace BGaussCRM.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    //[Authorize(Roles = "admin")]
    public class ExchangeAdminController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ExchangeAdminController(AppDbContext db) => _db = db;

        private string AdminUser => User.Identity?.Name
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? "admin";

        // ─────────────────────────────────────────────────────
        // A02 — Dashboard Stats
        // GET /api/ExchangeAdmin/dashboard-stats
        // ─────────────────────────────────────────────────────
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
                    a.Action,
                    a.AdminUser,
                    a.ActionAt,
                    a.PriceSet,
                })
                .ToListAsync();

            var stats = new
            {
                Total          = cases.Count,
                Pending        = cases.Count(c => c.Status == "PendingAdminReview"),
                Approved       = cases.Count(c => c.Status == "AdminApproved" || c.Status == "AdminModified"),
                Rejected       = cases.Count(c => c.Status == "AdminRejected"),
                Draft          = cases.Count(c => c.Status == "Draft"),
                ThisWeek       = cases.Count(c => c.CreatedAt >= DateTime.UtcNow.AddDays(-7)),
                RecentActivity = recentActivity,
            };

            return Ok(stats);
        }

        // ─────────────────────────────────────────────────────
        // A03 — Case Queue
        // GET /api/ExchangeAdmin/queue?status=PendingAdminReview&page=1&pageSize=15
        // ─────────────────────────────────────────────────────
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

            if (!string.IsNullOrEmpty(status))
                q = q.Where(c => c.Status == status);

            if (!string.IsNullOrEmpty(search))
                q = q.Where(c =>
                    c.CaseNumber.Contains(search)    ||
                    c.CustomerName.Contains(search)  ||
                    c.VehicleModel.Contains(search)  ||
                    c.RegistrationNo.Contains(search)||
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

            var items = await q
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
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

        // ─────────────────────────────────────────────────────
        // A04 — Case Detail View
        // GET /api/ExchangeAdmin/cases/{id}
        //
        // FIX: All three navigation collections (ExchangeInspectionScores,
        //      ExchangeCaseImages, ExchangeAdminActions) are null-coalesced
        //      to empty enumerables before any LINQ is applied.
        //      This prevents NullReferenceException when a case is in Draft
        //      state and has no scores / images / actions yet.
        // ─────────────────────────────────────────────────────
        [HttpGet("cases/{id}")]
        public async Task<IActionResult> GetCaseDetail(int id)
        {
            var c = await _db.ExchangeCases
                .Include(x => x.ExchangeInspectionScores)
                .Include(x => x.ExchangeCaseImages)
                .Include(x => x.ExchangeAdminActions)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return NotFound();

            // ── NULL-SAFE: scores may be empty for Draft cases ──────────
            var scores = c.ExchangeInspectionScores
                         ?? Enumerable.Empty<ExchangeInspectionScore>();

            var scoresByCategory = scores
                .GroupBy(s => s.Category)
                .Select(g => new
                {
                    Category   = g.Key,
                    Parameters = g.Select(s => new { s.Parameter, s.Score }).ToList(),
                    Average    = g.Any() ? g.Average(s => (double)s.Score) : 0.0,
                })
                .ToList();

            // ── NULL-SAFE: images may be empty for Draft cases ──────────
            var images = (c.ExchangeCaseImages
                         ?? Enumerable.Empty<ExchangeCaseImage>())
                .Select(i => new
                {
                    i.ImageType,
                    i.ImagePath,
                    i.UploadedAt,
                })
                .ToList();

            // ── NULL-SAFE: admin actions empty until first decision ──────
            var adminActions = (c.ExchangeAdminActions
                               ?? Enumerable.Empty<ExchangeAdminAction>())
                .OrderByDescending(a => a.ActionAt)
                .Select(a => new
                {
                    a.Action,
                    a.AdminUser,
                    a.ActionAt,
                    a.PriceSet,
                    a.Note,
                })
                .ToList();

            return Ok(new
            {
                c.Id,
                c.CaseNumber,
                c.CustomerName,
                c.MobileNumber,
                c.City,
                c.VehicleModel,
                c.RegistrationNo,
                c.YearOfPurchase,
                c.KmDriven,
                c.Grade,
                c.TotalScore,
                c.RecommendedPrice,
                c.MinPrice,
                c.MaxPrice,
                c.Status,
                c.DealerId,
                c.SubmittedAt,
                c.CreatedAt,
                c.AdminNote,
                c.ApprovedPrice,
                c.AdminActionAt,
                ScoresByCategory = scoresByCategory,
                Images           = images,
                AdminActions     = adminActions,
            });
        }

        // ─────────────────────────────────────────────────────
        // A05 — Image list for a case
        // GET /api/ExchangeAdmin/cases/{id}/images
        // ─────────────────────────────────────────────────────
        [HttpGet("cases/{id}/images")]
        public async Task<IActionResult> GetCaseImages(int id)
        {
            var images = await _db.ExchangeCaseImages
                .Where(i => i.CaseId == id)
                .Select(i => new { i.ImageType, i.ImagePath, i.UploadedAt })
                .ToListAsync();

            return Ok(images);
        }

        // ─────────────────────────────────────────────────────
        // A06 / A07 / A08 / A09 — Price Decision
        // POST /api/ExchangeAdmin/cases/{id}/decide
        // Body: { action: "Approved"|"Modified"|"Rejected", price?: decimal, note?: string }
        // ─────────────────────────────────────────────────────
        [HttpPost("cases/{id}/decide")]
        public async Task<IActionResult> DecideCase(int id, [FromBody] AdminDecisionDto dto)
        {
            var c = await _db.ExchangeCases.FindAsync(id);
            if (c == null) return NotFound();

            if (c.Status != "PendingAdminReview")
                return BadRequest(new { error = "Case is not pending review.", status = c.Status });

            // ── Validate action ─────────────────────────────────────────
            var validActions = new[] { "Approved", "Modified", "Rejected" };
            if (!validActions.Contains(dto.Action))
                return BadRequest(new { error = "Invalid action. Must be Approved, Modified, or Rejected." });

            if (dto.Action == "Rejected" && string.IsNullOrWhiteSpace(dto.Note))
                return BadRequest(new { error = "Rejection reason is mandatory." });

            if (dto.Action == "Modified")
            {
                if (dto.Price == null)
                    return BadRequest(new { error = "Modified price is required." });
                if (string.IsNullOrWhiteSpace(dto.Note))
                    return BadRequest(new { error = "Reason for modification is mandatory." });
                if (dto.Price < c.MinPrice || dto.Price > c.MaxPrice)
                    return BadRequest(new
                    {
                        error = $"Modified price must be within band: ₹{c.MinPrice:N0} – ₹{c.MaxPrice:N0}"
                    });
            }

            // ── Update case ─────────────────────────────────────────────
            c.Status = dto.Action switch
            {
                "Approved" => "AdminApproved",
                "Modified" => "AdminModified",
                _          => "AdminRejected",
            };

            c.AdminNote = dto.Note;
            c.ApprovedPrice = dto.Action switch
            {
                "Rejected" => null,
                "Approved" => c.RecommendedPrice,
                _          => dto.Price,
            };
            c.AdminActionAt = DateTime.UtcNow;
            c.UpdatedAt     = DateTime.UtcNow;

            // ── Audit log ───────────────────────────────────────────────
            _db.ExchangeAdminActions.Add(new ExchangeAdminAction
            {
                CaseId    = id,
                AdminUser = AdminUser,
                Action    = dto.Action,
                PriceSet  = c.ApprovedPrice,
                Note      = dto.Note,
            });

            // ── Notification log (A11 / Module 1 dealer polling) ────────
            var message = dto.Action switch
            {
                "Approved" => $"Your case {c.CaseNumber} has been approved. Final price: ₹{c.ApprovedPrice:N0}",
                "Modified" => $"Your case {c.CaseNumber} price was modified to ₹{c.ApprovedPrice:N0}. Reason: {dto.Note}",
                "Rejected" => $"Your case {c.CaseNumber} was rejected. Reason: {dto.Note}",
                _          => $"Case {c.CaseNumber} status updated.",
            };

            _db.ExchangeNotificationLogs.Add(new ExchangeNotificationLog
            {
                CaseId     = id,
                DealerId   = c.DealerId,
                ActionType = dto.Action,
                Message    = message,
            });

            await _db.SaveChangesAsync();

            return Ok(new
            {
                caseNumber    = c.CaseNumber,
                status        = c.Status,
                approvedPrice = c.ApprovedPrice,
                adminActionAt = c.AdminActionAt,
                message,
            });
        }

        // ─────────────────────────────────────────────────────
        // A11 — Notification Log
        // GET /api/ExchangeAdmin/notifications?page=1&pageSize=30
        // ─────────────────────────────────────────────────────
        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] int     page     = 1,
            [FromQuery] int     pageSize = 30,
            [FromQuery] string? dealerId = null)
        {
            var q = _db.ExchangeNotificationLogs
                .Include(n => n.Case)
                .AsQueryable();

            if (!string.IsNullOrEmpty(dealerId))
                q = q.Where(n => n.DealerId == dealerId);

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(n => n.SentAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new
                {
                    n.Id,
                    n.CaseId,
                    CaseNumber = n.Case.CaseNumber,
                    n.DealerId,
                    n.ActionType,
                    n.Message,
                    n.SentAt,
                    n.IsRead,
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // ─────────────────────────────────────────────────────
        // Mark notification as read
        // PATCH /api/ExchangeAdmin/notifications/{id}/read
        // ─────────────────────────────────────────────────────
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