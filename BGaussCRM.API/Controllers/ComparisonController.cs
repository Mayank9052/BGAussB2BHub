using BGaussCRM.API.Data;
using BGaussCRM.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGaussCRM.API.DTOs;

namespace BGaussCRM.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ComparisonController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public ComparisonController(AppDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        // =============================================
        // GET /api/Comparison/list
        // Returns all active comparison cards (screenshot 1)
        // =============================================
        [HttpGet("list")]
        public async Task<IActionResult> GetComparisonList()
        {
            var configs = await _context.ComparisonConfigs
                .Where(c => c.IsActive)
                .Include(c => c.Scooty1).ThenInclude(s => s.Model)
                .Include(c => c.Scooty1).ThenInclude(s => s.Variant)
                .Include(c => c.Scooty2).ThenInclude(s => s.Model)
                .Include(c => c.Scooty2).ThenInclude(s => s.Variant)
                .Select(c => new
                {
                    c.Id,
                    c.Scooty1Id,
                    c.Scooty2Id,
                    Model1Name   = c.Scooty1.Model.ModelName,
                    Model2Name   = c.Scooty2.Model.ModelName,
                    Variant1Name = c.Scooty1.Variant.VariantName,
                    Variant2Name = c.Scooty2.Variant.VariantName,
                    Price1       = c.Scooty1.Price,
                    Price2       = c.Scooty2.Price,
                    Image1Url    = c.Scooty1.ImageUrl,
                    Image2Url    = c.Scooty2.ImageUrl,
                })
                .ToListAsync();

            return Ok(configs);
        }

        // =============================================
        // GET /api/Comparison/{scootyId}
        // Returns all data for ONE scooty for the comparison detail page
        // =============================================
        [HttpGet("{scootyId:int}")]
        public async Task<IActionResult> GetComparisonData(int scootyId)
        {
            var scooty = await _context.ScootyInventories
                .Include(s => s.Model)
                .Include(s => s.Variant)
                .Include(s => s.Colour)
                .Include(s => s.VehicleReviews)
                .Include(s => s.RoadPrices)
                .Include(s => s.ScootySpec)               // ScootySpecs navigation
                .FirstOrDefaultAsync(s => s.ScootyId == scootyId);

            if (scooty == null)
                return NotFound($"Scooty ID {scootyId} not found.");

            // Average rating from VehicleReview
            var avgRating    = scooty.VehicleReviews.Any()
                ? scooty.VehicleReviews.Average(r => r.Rating)
                : 0.0;
            var reviewCount  = scooty.VehicleReviews.Count;

            // Insurance from first RoadPrice record (use lowest city or first)
            var insurance    = scooty.RoadPrices.FirstOrDefault()?.InsuranceAmount;

            // ExShowroom from RoadPrice
            var exShowroom   = scooty.RoadPrices.FirstOrDefault()?.ExShowroomPrice;

            // Brochure for this model
            var brochure = await _context.VehicleBrochures
                .Where(b => b.ModelId == scooty.ModelId)
                .OrderByDescending(b => b.UploadedAt)
                .Select(b => b.BrochureUrl)
                .FirstOrDefaultAsync();

            // Colours for this model + variant
            var colours = await _context.VehicleColours
                .Where(c => c.ModelId == scooty.ModelId && c.VariantId == scooty.VariantId)
                .Select(c => new { c.ColourName, c.HexCode })
                .ToListAsync();

            var specs = scooty.ScootySpec; // ScootySpec entity (nullable)

            var result = new
            {
                scooty.ScootyId,
                ModelName    = scooty.Model.ModelName,
                VariantName  = scooty.Variant.VariantName,
                scooty.ImageUrl,
                scooty.Price,

                // Basic Info
                BrandName         = "BGauss",
                AvgRating         = Math.Round(avgRating, 1),
                ReviewCount       = reviewCount,
                ExShowroomPrice   = exShowroom,
                InsuranceAmount   = insurance,
                FuelType          = specs?.FuelType ?? "Electric",

                // Performance
                scooty.MaxPowerKw,
                scooty.RangeKm,
                scooty.ChargingTimeHrs,
                RidingModes  = specs?.RidingModes,
                ReverseMode  = specs?.ReverseMode ?? false,
                CruiseControl = specs?.CruiseControl ?? false,

                // Brakes & Wheels
                scooty.BrakeFront,
                scooty.BrakeRear,
                scooty.BrakingType,
                scooty.WheelSize,
                scooty.WheelType,

                // Features
                scooty.StartingType,
                scooty.Speedometer,
                UsbCharging = specs?.UsbCharging ?? false,

                // Colours
                Colours = colours,

                // Brochure
                BrochureUrl = brochure,

                // Warranty
                BatteryWarranty = specs?.BatteryWarranty,
                MotorWarranty   = specs?.MotorWarranty,
            };

            return Ok(result);
        }

        // =============================================
        // GET /api/Comparison/variants-by-scooty/{scootyId}
        // Returns all variant options for the same MODEL as this scooty
        // Powers the variant dropdown in comparison detail (screenshot 3)
        // =============================================
        [HttpGet("variants-by-scooty/{scootyId:int}")]
        public async Task<IActionResult> GetVariantsByScooty(int scootyId)
        {
            // Find the modelId of this scooty
            var scooty = await _context.ScootyInventories
                .Where(s => s.ScootyId == scootyId)
                .Select(s => new { s.ModelId })
                .FirstOrDefaultAsync();

            if (scooty == null)
                return NotFound();

            // Return all scooties in the same model as selectable variants
            var variants = await _context.ScootyInventories
                .Include(s => s.Variant)
                .Where(s => s.ModelId == scooty.ModelId)
                .Select(s => new
                {
                    s.ScootyId,
                    VariantName = s.Variant.VariantName,
                    s.Price,
                })
                .ToListAsync();

            return Ok(variants);
        }

        // =============================================
        // POST /api/Comparison/config
        // Admin: Create a new comparison pair (for ComparisonConfig table)
        // =============================================
        [HttpPost("config")]
        public async Task<IActionResult> CreateConfig([FromBody] CreateComparisonConfigDto dto)
        {
            var s1Exists = await _context.ScootyInventories.AnyAsync(s => s.ScootyId == dto.Scooty1Id);
            var s2Exists = await _context.ScootyInventories.AnyAsync(s => s.ScootyId == dto.Scooty2Id);

            if (!s1Exists) return BadRequest($"Scooty1 ID {dto.Scooty1Id} not found.");
            if (!s2Exists) return BadRequest($"Scooty2 ID {dto.Scooty2Id} not found.");

            // Prevent duplicate pairs
            var exists = await _context.ComparisonConfigs.AnyAsync(c =>
                (c.Scooty1Id == dto.Scooty1Id && c.Scooty2Id == dto.Scooty2Id) ||
                (c.Scooty1Id == dto.Scooty2Id && c.Scooty2Id == dto.Scooty1Id));

            if (exists) return BadRequest("This comparison pair already exists.");

            _context.ComparisonConfigs.Add(new ComparisonConfig
            {
                Scooty1Id = dto.Scooty1Id,
                Scooty2Id = dto.Scooty2Id,
                IsActive  = true,
            });

            await _context.SaveChangesAsync();
            return Ok("Comparison config created.");
        }

        // =============================================
        // PUT /api/Comparison/config/{id}/toggle
        // Admin: Toggle active/inactive
        // =============================================
        [HttpPut("config/{id:int}/toggle")]
        public async Task<IActionResult> ToggleConfig(int id)
        {
            var config = await _context.ComparisonConfigs.FindAsync(id);
            if (config == null) return NotFound();
            config.IsActive = !config.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { config.IsActive });
        }

        // =============================================
        // DELETE /api/Comparison/config/{id}
        // =============================================
        [HttpDelete("config/{id:int}")]
        public async Task<IActionResult> DeleteConfig(int id)
        {
            var config = await _context.ComparisonConfigs.FindAsync(id);
            if (config == null) return NotFound();
            _context.ComparisonConfigs.Remove(config);
            await _context.SaveChangesAsync();
            return Ok("Deleted.");
        }

        // =============================================
        // GET /api/Comparison/list-all
        // Returns ALL pairs including inactive (admin manage page)
        // =============================================
        [HttpGet("list-all")]
        public async Task<IActionResult> GetComparisonListAll()
        {
            var configs = await _context.ComparisonConfigs
                .Include(c => c.Scooty1).ThenInclude(s => s.Model)
                .Include(c => c.Scooty1).ThenInclude(s => s.Variant)
                .Include(c => c.Scooty2).ThenInclude(s => s.Model)
                .Include(c => c.Scooty2).ThenInclude(s => s.Variant)
                .OrderByDescending(c => c.IsActive)
                .ThenBy(c => c.Id)
                .Select(c => new
                {
                    c.Id,
                    c.Scooty1Id,
                    c.Scooty2Id,
                    c.IsActive,
                    Model1Name   = c.Scooty1.Model.ModelName,
                    Model2Name   = c.Scooty2.Model.ModelName,
                    Variant1Name = c.Scooty1.Variant.VariantName,
                    Variant2Name = c.Scooty2.Variant.VariantName,
                    Price1       = c.Scooty1.Price,
                    Price2       = c.Scooty2.Price,
                    Image1Url    = c.Scooty1.ImageUrl,
                    Image2Url    = c.Scooty2.ImageUrl,
                })
                .ToListAsync();

            return Ok(configs);
        }


        // =============================================
        // POST /api/Comparison/brochure/upload
        // Admin: Upload brochure PDF for a model
        // =============================================
        [HttpPost("brochure/upload")]
        public async Task<IActionResult> UploadBrochure([FromForm] int modelId, [FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Only PDF files are allowed.");

            var modelExists = await _context.VehicleModels.AnyAsync(m => m.Id == modelId);
            if (!modelExists) return BadRequest($"Model ID {modelId} not found.");

            var rootPath = _environment.WebRootPath
                ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            var folder = Path.Combine(rootPath, "Brochures");
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);

            var fileName = $"brochure_model_{modelId}_{Guid.NewGuid()}.pdf";
            var filePath = Path.Combine(folder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            var url = $"/Brochures/{fileName}";

            _context.VehicleBrochures.Add(new VehicleBrochure
            {
                ModelId    = modelId,
                BrochureUrl = url,
                UploadedAt = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync();
            return Ok(new { url });
        }
    }
}