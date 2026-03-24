using BGaussCRM.API.Data;
using BGaussCRM.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGaussCRM.API.DTOs;
using OfficeOpenXml;

namespace BGaussCRM.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoadPriceController : ControllerBase
    {
        private readonly AppDbContext _context;
        public RoadPriceController(AppDbContext context) { _context = context; }

        // =============================================
        // GET ALL CITIES  (search + popular)
        // GET /api/RoadPrice/cities?search=mum
        // =============================================
        [HttpGet("cities")]
        public async Task<IActionResult> GetCities([FromQuery] string? search)
        {
            var query = _context.Cities.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(c =>
                    c.CityName.ToLower().Contains(search.ToLower()) ||
                    c.StateName.ToLower().Contains(search.ToLower()));

            var cities = await query
                .OrderByDescending(c => c.IsPopular)
                .ThenBy(c => c.CityName)
                .Select(c => new
                {
                    c.Id,
                    c.CityName,
                    c.StateName,
                    c.IsPopular
                })
                .ToListAsync();

            return Ok(cities);
        }

        // =============================================
        // GET ROAD PRICE for a scooty in a city
        // GET /api/RoadPrice/{scootyId}/city/{cityId}
        // =============================================
        [HttpGet("{scootyId}/city/{cityId}")]
        public async Task<IActionResult> GetRoadPrice(int scootyId, int cityId)
        {
            var rp = await _context.RoadPrices
                .Include(r => r.Scooty).ThenInclude(s => s.Model)
                .Include(r => r.Scooty).ThenInclude(s => s.Variant)
                .Include(r => r.Scooty).ThenInclude(s => s.Colour)
                .Include(r => r.City)
                .Where(r => r.ScootyId == scootyId && r.CityId == cityId)
                .Select(r => new
                {
                    r.Id,
                    r.ScootyId,
                    ModelName   = r.Scooty.Model.ModelName,
                    VariantName = r.Scooty.Variant.VariantName,
                    ColourName  = r.Scooty.Colour != null ? r.Scooty.Colour.ColourName : null,
                    CityId      = r.City.Id,
                    CityName    = r.City.CityName,
                    StateName   = r.City.StateName,
                    r.ExShowroomPrice,
                    r.RtoCharges,
                    r.InsuranceAmount,
                    r.OtherCharges,
                    OnRoadPrice = r.ExShowroomPrice + r.RtoCharges + r.InsuranceAmount + r.OtherCharges,
                    r.ValidFrom,
                    r.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (rp == null)
                return NotFound(new { message = "Road price not available for this city." });

            return Ok(rp);
        }

        // =============================================
        // GET ALL CITIES WITH PRICES for a scooty
        // GET /api/RoadPrice/{scootyId}/all-cities
        // =============================================
        [HttpGet("{scootyId}/all-cities")]
        public async Task<IActionResult> GetAllCitiesForScooty(int scootyId)
        {
            var data = await _context.RoadPrices
                .Include(r => r.City)
                .Where(r => r.ScootyId == scootyId)
                .Select(r => new
                {
                    CityId    = r.City.Id,
                    CityName  = r.City.CityName,
                    StateName = r.City.StateName,
                    OnRoadPrice = r.ExShowroomPrice + r.RtoCharges + r.InsuranceAmount + r.OtherCharges
                })
                .OrderBy(r => r.CityName)
                .ToListAsync();

            return Ok(data);
        }

        // =============================================
        // ADD / UPDATE ROAD PRICE (Admin)
        // POST /api/RoadPrice/upsert
        // =============================================
        [HttpPost("upsert")]
        public async Task<IActionResult> Upsert([FromBody] UpsertRoadPriceDto dto)
        {
            if (dto.ExShowroomPrice <= 0)
                return BadRequest("Ex-Showroom price must be greater than 0.");

            var scootyExists = await _context.ScootyInventories.AnyAsync(s => s.ScootyId == dto.ScootyId);
            if (!scootyExists) return BadRequest($"Scooty ID {dto.ScootyId} not found.");

            var cityExists = await _context.Cities.AnyAsync(c => c.Id == dto.CityId);
            if (!cityExists) return BadRequest($"City ID {dto.CityId} not found.");

            var existing = await _context.RoadPrices
                .FirstOrDefaultAsync(r => r.ScootyId == dto.ScootyId && r.CityId == dto.CityId);

            if (existing != null)
            {
                existing.ExShowroomPrice = dto.ExShowroomPrice;
                existing.RtoCharges      = dto.RtoCharges;
                existing.InsuranceAmount = dto.InsuranceAmount;
                existing.OtherCharges    = dto.OtherCharges;
                existing.ValidFrom = dto.ValidFrom ?? DateOnly.FromDateTime(DateTime.Today);
                existing.UpdatedAt       = DateTime.UtcNow;
            }
            else
            {
                _context.RoadPrices.Add(new RoadPrice
                {
                    ScootyId        = dto.ScootyId,
                    CityId          = dto.CityId,
                    ExShowroomPrice = dto.ExShowroomPrice,
                    RtoCharges      = dto.RtoCharges,
                    InsuranceAmount = dto.InsuranceAmount,
                    OtherCharges    = dto.OtherCharges,
                    ValidFrom       = dto.ValidFrom ?? DateOnly.FromDateTime(DateTime.Today),
                    UpdatedAt       = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Road price saved successfully." });
        }

        // =============================================
        // DELETE ROAD PRICE
        // DELETE /api/RoadPrice/{id}
        // =============================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var rp = await _context.RoadPrices.FindAsync(id);
            if (rp == null) return NotFound();
            _context.RoadPrices.Remove(rp);
            await _context.SaveChangesAsync();
            return Ok("Deleted");
        }

        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            using var package = new ExcelPackage();

            var sheet = package.Workbook.Worksheets.Add("RoadPrices");

            sheet.Cells[1, 1].Value = "ScootyId";
            sheet.Cells[1, 2].Value = "CityId";
            sheet.Cells[1, 3].Value = "ExShowroomPrice";
            sheet.Cells[1, 4].Value = "RtoCharges";
            sheet.Cells[1, 5].Value = "InsuranceAmount";
            sheet.Cells[1, 6].Value = "OtherCharges";
            sheet.Cells[1, 7].Value = "ValidFrom (yyyy-MM-dd)";

            var stream = new MemoryStream(package.GetAsByteArray());

            return File(stream,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "RoadPriceTemplate.xlsx");
        }

        [HttpPost("import")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var toInsert = new List<RoadPrice>();
            int updatedCount = 0;
            var skippedRows = new List<int>();

            var existingData = await _context.RoadPrices.ToListAsync();

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var package = new ExcelPackage(stream);
            var sheet = package.Workbook.Worksheets.FirstOrDefault();

            if (sheet == null)
                return BadRequest("Invalid Excel file.");

            int rowCount = sheet.Dimension.Rows;

            for (int row = 2; row <= rowCount; row++)
            {
                var scootyText = sheet.Cells[row, 1].Text;
                var cityText   = sheet.Cells[row, 2].Text;
                var exText     = sheet.Cells[row, 3].Text;
                var rtoText    = sheet.Cells[row, 4].Text;
                var insText    = sheet.Cells[row, 5].Text;
                var otherText  = sheet.Cells[row, 6].Text;
                var dateText   = sheet.Cells[row, 7].Text;

                if (!int.TryParse(scootyText, out int scootyId) ||
                    !int.TryParse(cityText, out int cityId))
                {
                    skippedRows.Add(row);
                    continue;
                }

                decimal exPrice = decimal.TryParse(exText, out var ex) ? ex : 0;
                decimal rto     = decimal.TryParse(rtoText, out var r) ? r : 0;
                decimal ins     = decimal.TryParse(insText, out var i) ? i : 0;
                decimal other   = decimal.TryParse(otherText, out var o) ? o : 0;

                DateOnly validFrom;
                if (!DateOnly.TryParse(dateText, out validFrom))
                    validFrom = DateOnly.FromDateTime(DateTime.Today);

                // ✅ Check existing (UNIQUE ScootyId + CityId)
                var existing = existingData.FirstOrDefault(x =>
                    x.ScootyId == scootyId && x.CityId == cityId);

                if (existing != null)
                {
                    existing.ExShowroomPrice = exPrice;
                    existing.RtoCharges = rto;
                    existing.InsuranceAmount = ins;
                    existing.OtherCharges = other;
                    existing.ValidFrom = validFrom;
                    existing.UpdatedAt = DateTime.UtcNow;

                    updatedCount++;
                    continue;
                }

                // ✅ Insert new
                toInsert.Add(new RoadPrice
                {
                    ScootyId = scootyId,
                    CityId = cityId,
                    ExShowroomPrice = exPrice,
                    RtoCharges = rto,
                    InsuranceAmount = ins,
                    OtherCharges = other,
                    ValidFrom = validFrom,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            if (toInsert.Any())
                await _context.RoadPrices.AddRangeAsync(toInsert);

            if (toInsert.Any() || updatedCount > 0)
                await _context.SaveChangesAsync();

            var message = $"{toInsert.Count} inserted, {updatedCount} updated.";

            if (skippedRows.Any())
                message += $" Skipped rows: {string.Join(",", skippedRows)}";

            return Ok(message);
        }
    }
    
}
