using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using BGaussCRM.API.Data;
using BGaussCRM.API.Models;

namespace BGaussCRM.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CityController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CityController(AppDbContext context)
        {
            _context = context;
        }

        // =============================
        // GET ALL CITIES
        // =============================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var cities = await _context.Cities
                .OrderByDescending(c => c.IsPopular)
                .ThenBy(c => c.CityName)
                .ToListAsync();

            return Ok(cities);
        }

        // =============================
        // GET BY ID
        // =============================
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var city = await _context.Cities.FindAsync(id);

            if (city == null)
                return NotFound();

            return Ok(city);
        }

        // =============================
        // ADD CITY
        // =============================
        [HttpPost]
        public async Task<IActionResult> Add(City model)
        {
            if (string.IsNullOrWhiteSpace(model.CityName))
                return BadRequest("City name is required.");

            var exists = await _context.Cities
                .AnyAsync(x => x.CityName == model.CityName.Trim());

            if (exists)
                return BadRequest("City already exists.");

            model.CityName = model.CityName.Trim();
            model.StateName = model.StateName?.Trim() ?? "";

            _context.Cities.Add(model);
            await _context.SaveChangesAsync();

            return Ok(model);
        }

        // =============================
        // UPDATE CITY
        // =============================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, City model)
        {
            var existing = await _context.Cities.FindAsync(id);

            if (existing == null)
                return NotFound();

            existing.CityName = model.CityName.Trim();
            existing.StateName = model.StateName?.Trim() ?? "";
            existing.IsPopular = model.IsPopular;

            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        // =============================
        // DELETE CITY
        // =============================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var city = await _context.Cities.FindAsync(id);

            if (city == null)
                return NotFound();

            _context.Cities.Remove(city);
            await _context.SaveChangesAsync();

            return Ok("Deleted successfully");
        }

        // =============================
        // DOWNLOAD EXCEL TEMPLATE
        // =============================
        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            using var package = new ExcelPackage();

            var sheet = package.Workbook.Worksheets.Add("Cities");

            sheet.Cells[1, 1].Value = "CityName";
            sheet.Cells[1, 2].Value = "StateName";
            sheet.Cells[1, 3].Value = "IsPopular (true/false)";

            var stream = new MemoryStream(package.GetAsByteArray());

            return File(stream,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "CityTemplate.xlsx");
        }

        // =============================
        // IMPORT EXCEL (INSERT + UPDATE)
        // =============================
        [HttpPost("import")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var toInsert = new List<City>();
            int updatedCount = 0;
            var skippedRows = new List<int>();

            var existingCities = await _context.Cities.ToListAsync();

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
                var cityName = sheet.Cells[row, 1].Text.Trim();
                var stateName = sheet.Cells[row, 2].Text.Trim();
                var popularText = sheet.Cells[row, 3].Text;

                if (string.IsNullOrWhiteSpace(cityName))
                {
                    skippedRows.Add(row);
                    continue;
                }

                bool isPopular = popularText == "1" || popularText.ToLower() == "true";

                var existing = existingCities
                    .FirstOrDefault(x => x.CityName.ToLower() == cityName.ToLower());

                if (existing != null)
                {
                    existing.StateName = stateName;
                    existing.IsPopular = isPopular;
                    updatedCount++;
                    continue;
                }

                toInsert.Add(new City
                {
                    CityName = cityName,
                    StateName = stateName,
                    IsPopular = isPopular
                });
            }

            if (toInsert.Any())
                await _context.Cities.AddRangeAsync(toInsert);

            if (toInsert.Any() || updatedCount > 0)
                await _context.SaveChangesAsync();

            var message = $"{toInsert.Count} inserted, {updatedCount} updated.";

            if (skippedRows.Any())
                message += $" Skipped rows: {string.Join(",", skippedRows)}";

            return Ok(message);
        }
    }
}