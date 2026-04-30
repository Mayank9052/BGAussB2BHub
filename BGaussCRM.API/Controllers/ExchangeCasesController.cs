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
    //[Authorize]
    public class ExchangeCasesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private const string IMG_FOLDER = "ExchangeImages";

        // ── Inspection parameters definition ──────────────────
        private static readonly Dictionary<string, string[]> InspectionParams = new()
        {
            ["Battery"]     = new[] { "Health", "Charge Capacity", "Physical Damage" },
            ["Body"]        = new[] { "Dents", "Scratches", "Paint Condition" },
            ["Tyres"]       = new[] { "Tread Depth", "Condition", "Age" },
            ["Electricals"] = new[] { "Lights", "Horn", "Indicators", "Charging Port" },
            ["Misc"]        = new[] { "Documentation", "Accessories", "Service History" },
        };

        // ── Price calculation weights ──────────────────────────
        private static readonly Dictionary<string, decimal> CategoryWeights = new()
        {
            ["Battery"]     = 0.35m,
            ["Body"]        = 0.25m,
            ["Tyres"]       = 0.15m,
            ["Electricals"] = 0.15m,
            ["Misc"]        = 0.10m,
        };

        public ExchangeCasesController(AppDbContext db, IWebHostEnvironment env)
        {
            _db  = db;
            _env = env;
        }

        private string CurrentUser => User.Identity?.Name
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? "unknown";

        private bool IsAdmin => User.IsInRole("admin");

        // ── GET /api/ExchangeCases ────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var q = _db.ExchangeCases.AsQueryable();

            if (!IsAdmin)
                q = q.Where(c => c.DealerId == CurrentUser);

            if (!string.IsNullOrEmpty(status))
                q = q.Where(c => c.Status == status);

            var list = await q
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id, c.CaseNumber, c.CustomerName, c.MobileNumber, c.City,
                    c.VehicleModel, c.RegistrationNo, c.YearOfPurchase, c.KmDriven,
                    c.Grade, c.TotalScore, c.RecommendedPrice, c.MinPrice, c.MaxPrice,
                    c.Status, c.DealerId, c.ApprovedPrice, c.AdminNote,
                    c.CreatedAt, c.SubmittedAt, c.AdminActionAt,
                    ImageCount = c.ExchangeCaseImages.Count,
                    ScoreCount = c.ExchangeInspectionScores.Count,
                })
                .ToListAsync();

            return Ok(list);
        }

        // ── GET /api/ExchangeCases/{id} ───────────────────────
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var c = await _db.ExchangeCases
                .Include(x => x.TotalScore)
                .Include(x => x.ExchangeCaseImages)
                .Include(x => x.ExchangeAdminActions)
                .Include(x => x.ExchangeInspectionScores)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return NotFound();
            if (!IsAdmin && c.DealerId != CurrentUser) return Forbid();

            return Ok(c);
        }

        // ── GET /api/ExchangeCases/inspection-params ──────────
        [HttpGet("inspection-params")]
        public IActionResult GetInspectionParams()
            => Ok(InspectionParams.Select(kv => new { category = kv.Key, parameters = kv.Value }));

        // ── POST /api/ExchangeCases/start ────────────────────
        // S02+S03: Create a new case with customer + vehicle info
        [HttpPost("start")]
        public async Task<IActionResult> Start([FromBody] StartCaseDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var year = DateTime.UtcNow.Year;
            var seq  = await _db.ExchangeCases.CountAsync() + 1;
            var caseNum = $"EX-{year}-{seq:D5}";

            var exchangeCase = new ExchangeCase
            {
                CaseNumber     = caseNum,
                CustomerName   = dto.CustomerName,
                MobileNumber   = dto.MobileNumber,
                City           = dto.City,
                VehicleModel   = dto.VehicleModel,
                RegistrationNo = dto.RegistrationNo,
                YearOfPurchase = dto.YearOfPurchase,
                KmDriven       = dto.KmDriven,
                DealerId       = CurrentUser,
                Status         = "Draft",
            };

            _db.ExchangeCases.Add(exchangeCase);
            await _db.SaveChangesAsync();

            return Ok(new { id = exchangeCase.Id, caseNumber = caseNum });
        }

        // ── POST /api/ExchangeCases/{id}/scores ──────────────
        // S04: Save inspection scores
        [HttpPost("{id}/scores")]
        public async Task<IActionResult> SaveScores(int id, [FromBody] List<ScoreDto> scores)
        {
            var c = await _db.ExchangeCases.Include(x => x.ExchangeInspectionScores)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (c == null) return NotFound();
            if (c.DealerId != CurrentUser) return Forbid();
            if (c.Status != "Draft") return BadRequest("Case is not in Draft status.");

            // Replace all scores
            _db.ExchangeInspectionScores.RemoveRange(c.ExchangeInspectionScores);
            await _db.SaveChangesAsync(); 
            foreach (var s in scores)
            {
                _db.ExchangeInspectionScores.Add(new ExchangeInspectionScore
                {
                    CaseId    = id,
                    Category  = s.Category,
                    Parameter = s.Parameter,
                    Score     = s.Score,
                });
            }

            // Compute weighted score + grade
            var (totalScore, grade) = ComputeScore(scores);
            c.TotalScore = totalScore;
            c.Grade      = grade;
            c.UpdatedAt  = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { totalScore, grade });
        }

        // ── POST /api/ExchangeCases/{id}/images ──────────────
        // S06: Upload one image at a time
        [HttpPost("{id}/images")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadImage(int id, [FromForm] string imageType, IFormFile image)
        {
            var validTypes = new[] { "Front", "Rear", "Left", "Right", "Odometer", "Battery" };
            if (!validTypes.Contains(imageType)) return BadRequest("Invalid imageType.");

            var c = await _db.ExchangeCases.Include(x => x.ExchangeCaseImages)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (c == null) return NotFound();
            // Remove dealer check in dev: if (c.DealerId != CurrentUser) return Forbid();

            if (image == null || image.Length == 0) return BadRequest("No image provided.");

            // ── FIX: use ContentRootPath as fallback when WebRootPath is null ──
            var webRoot = _env.WebRootPath;
            if (string.IsNullOrEmpty(webRoot))
            {
                webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
            }

            var folder = Path.Combine(webRoot, IMG_FOLDER, id.ToString());

            try
            {
                Directory.CreateDirectory(folder); // ← creates all missing directories
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Cannot create upload directory: {ex.Message}");
            }

            var ext     = Path.GetExtension(image.FileName).ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png" };
            if (!allowed.Contains(ext)) return BadRequest("Only JPG, PNG images are allowed.");

            var fileName = $"{imageType}{ext}";
            var filePath = Path.Combine(folder, fileName);

            try
            {
                await using var fs = System.IO.File.Create(filePath);
                await image.CopyToAsync(fs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to save image: {ex.Message}");
            }

            var relPath = $"/{IMG_FOLDER}/{id}/{fileName}";

            var existing = c.ExchangeCaseImages.FirstOrDefault(i => i.ImageType == imageType);
            if (existing != null)
                existing.ImagePath = relPath;
            else
                _db.ExchangeCaseImages.Add(new ExchangeCaseImage
                    { CaseId = id, ImageType = imageType, ImagePath = relPath });

            c.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { imageType, path = relPath });
        }

        // ── POST /api/ExchangeCases/{id}/generate-price ──────
        // S08: System generates price range (READ-ONLY for dealer)
        [HttpPost("{id}/generate-price")]
        public async Task<IActionResult> GeneratePrice(int id)
        {
            var c = await _db.ExchangeCases
                .Include(x => x.ExchangeCaseImages)
                .Include(x => x.ExchangeInspectionScores)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return NotFound();
            if (c.DealerId != CurrentUser) return Forbid();

            // Validate all 6 images uploaded
            var required = new[] { "Front", "Rear", "Left", "Right", "Odometer", "Battery" };
            var uploaded  = c.ExchangeCaseImages.Select(i => i.ImageType).ToHashSet();
            var missing   = required.Except(uploaded).ToList();
            if (missing.Any())
                return BadRequest(new { error = "ImagesMissing", missing });

            // Validate scores exist
            if (!c.ExchangeInspectionScores.Any())
                return BadRequest(new { error = "ScoresMissing" });

            // Price generation algorithm
            // Base price band from KM, Year, and Score
            var age         = DateTime.UtcNow.Year - c.YearOfPurchase;
            var score       = c.TotalScore ?? 5m;
            var baseValue   = GetBaseValue(c.VehicleModel);
            var depreciation = Math.Min(0.60m, age * 0.12m + c.KmDriven / 100000m * 0.08m);
            var scoreFactor  = 0.70m + (score / 10m) * 0.30m;

            var recommended = Math.Round(baseValue * (1 - depreciation) * scoreFactor / 1000) * 1000;
            var minPrice    = Math.Round(recommended * 0.90m / 1000) * 1000;
            var maxPrice    = Math.Round(recommended * 1.08m / 1000) * 1000;

            c.RecommendedPrice = recommended;
            c.MinPrice         = minPrice;
            c.MaxPrice         = maxPrice;
            c.Status           = "ImagesPending"; // ready for submission
            c.UpdatedAt        = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { recommended, minPrice, maxPrice, grade = c.Grade, totalScore = c.TotalScore });
        }

        // ── POST /api/ExchangeCases/{id}/submit ──────────────
        // S09→S10: Dealer submits for admin review
        [HttpPost("{id}/submit")]
        public async Task<IActionResult> Submit(int id)
        {
            var c = await _db.ExchangeCases
                .Include(x => x.ExchangeCaseImages)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return NotFound();
            if (c.DealerId != CurrentUser) return Forbid();

            var required = new[] { "Front", "Rear", "Left", "Right", "Odometer", "Battery" };
            var uploaded  = c.ExchangeCaseImages.Select(i => i.ImageType).ToHashSet();
            if (required.Except(uploaded).Any())
                return BadRequest("All 6 images must be uploaded before submission.");

            if (c.RecommendedPrice == null)
                return BadRequest("Price range must be generated before submission.");

            c.Status      = "PendingAdminReview";
            c.SubmittedAt = DateTime.UtcNow;
            c.UpdatedAt   = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { caseNumber = c.CaseNumber, status = c.Status });
        }

        // ── POST /api/ExchangeCases/{id}/admin-action ────────
        // Module 2: Admin approves / modifies / rejects
        [HttpPost("{id}/admin-action")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> AdminAction(int id, [FromBody] AdminActionDto dto)
        {
            var c = await _db.ExchangeCases.FindAsync(id);
            if (c == null) return NotFound();
            if (c.Status != "PendingAdminReview") return BadRequest("Case is not pending review.");

            var validActions = new[] { "Approved", "Modified", "Rejected" };
            if (!validActions.Contains(dto.Action)) return BadRequest("Invalid action.");

            c.Status        = dto.Action == "Approved" ? "AdminApproved"
                            : dto.Action == "Modified"  ? "AdminModified"
                            : "AdminRejected";
            c.AdminNote     = dto.Note;
            c.ApprovedPrice = dto.Action == "Rejected" ? null : dto.Price;
            c.AdminActionAt = DateTime.UtcNow;
            c.UpdatedAt     = DateTime.UtcNow;

            _db.ExchangeAdminActions.Add(new ExchangeAdminAction
            {
                CaseId    = id,
                AdminUser = CurrentUser,
                Action    = dto.Action,
                PriceSet  = dto.Price,
                Note      = dto.Note,
            });

            await _db.SaveChangesAsync();
            return Ok(new { status = c.Status, approvedPrice = c.ApprovedPrice });
        }

        // ── Helpers ───────────────────────────────────────────
        private static (decimal score, string grade) ComputeScore(List<ScoreDto> scores)
        {
            if (!scores.Any()) return (0, "Average");

            decimal weighted = 0;
            foreach (var g in scores.GroupBy(s => s.Category))
            {
                var avg = g.Average(x => (decimal)x.Score);
                if (CategoryWeights.TryGetValue(g.Key, out var w))
                    weighted += avg * w;
                else
                    weighted += avg * 0.05m;
            }

            var grade = weighted >= 8 ? "Excellent" : weighted >= 5 ? "Good" : "Average";
            return (Math.Round(weighted, 2), grade);
        }

        private static decimal GetBaseValue(string model)
        {
            // Simple lookup — extend with actual price table
            var upper = model.ToUpper();
            if (upper.Contains("RUV") || upper.Contains("350")) return 130000m;
            if (upper.Contains("MAX") || upper.Contains("C12")) return 115000m;
            return 95000m;
        }
    }
}