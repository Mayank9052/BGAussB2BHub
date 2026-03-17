using BGaussCRM.API.Data;
using BGaussCRM.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;

namespace BGaussCRM.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VehicleColoursController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VehicleColoursController(AppDbContext context)
        {
            _context = context;
        }

        // ==========================
        // GET ALL COLOURS
        // ==========================
        [HttpGet]
        public async Task<IActionResult> GetColours()
        {
            var colours = await _context.VehicleColours.ToListAsync();
            return Ok(colours);
        }

        // ==========================
        // GET COLOUR BY ID
        // ==========================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetColour(int id)
        {
            var colour = await _context.VehicleColours.FindAsync(id);

            if (colour == null)
                return NotFound();

            return Ok(colour);
        }

        // ==========================
        // CREATE COLOUR
        // ==========================
        [HttpPost]
        public async Task<IActionResult> CreateColour(VehicleColour colour)
        {
            _context.VehicleColours.Add(colour);
            await _context.SaveChangesAsync();

            return Ok(colour);
        }

        // ==========================
        // UPDATE COLOUR
        // ==========================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateColour(int id, VehicleColour colour)
        {
            if (id != colour.Id)
                return BadRequest();

            _context.Entry(colour).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(colour);
        }

        // ==========================
        // DELETE COLOUR
        // ==========================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteColour(int id)
        {
            var colour = await _context.VehicleColours.FindAsync(id);

            if (colour == null)
                return NotFound();

            _context.VehicleColours.Remove(colour);
            await _context.SaveChangesAsync();

            return Ok("Deleted successfully");
        }

        // ==========================
        // DOWNLOAD BLANK EXCEL TEMPLATE
        // ==========================
        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("VehicleColours");

            worksheet.Cells[1, 1].Value = "ColourName";
            worksheet.Cells[1, 2].Value = "ModelId";
            worksheet.Cells[1, 3].Value = "VariantId";

            var stream = new MemoryStream(package.GetAsByteArray());

            return File(stream,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "VehicleColoursTemplate.xlsx");
        }

        // ==========================
        // IMPORT EXCEL
        // ==========================
        [HttpPost("import")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var coloursToInsert = new List<VehicleColour>();
            int updatedCount = 0;
            var skippedRows = new List<int>();

            try
            {
                // Load existing colours
                var existingColours = await _context.VehicleColours.ToListAsync();

                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                using var package = new ExcelPackage(stream);
                var worksheet = package.Workbook.Worksheets.FirstOrDefault();

                if (worksheet == null)
                    return BadRequest("Invalid Excel file.");

                int rowCount = worksheet.Dimension.Rows;

                for (int row = 2; row <= rowCount; row++)
                {
                    var colourName = worksheet.Cells[row, 1].Text?.Trim();

                    if (string.IsNullOrWhiteSpace(colourName))
                    {
                        skippedRows.Add(row);
                        continue;
                    }

                    int? modelId = int.TryParse(worksheet.Cells[row, 2].Text, out var mId) ? mId : (int?)null;
                    int? variantId = int.TryParse(worksheet.Cells[row, 3].Text, out var vId) ? vId : (int?)null;

                    // Check if colour already exists
                    var existingColour = existingColours.FirstOrDefault(c =>
                        c.ColourName!.Equals(colourName, StringComparison.OrdinalIgnoreCase) &&
                        c.ModelId == modelId &&
                        c.VariantId == variantId
                    );

                    if (existingColour != null)
                    {
                        // Update existing record if needed
                        updatedCount++;
                        continue;
                    }

                    // Insert new colour
                    coloursToInsert.Add(new VehicleColour
                    {
                        ColourName = colourName,
                        ModelId = modelId,
                        VariantId = variantId
                    });
                }

                if (coloursToInsert.Any())
                    await _context.VehicleColours.AddRangeAsync(coloursToInsert);

                if (coloursToInsert.Any() || updatedCount > 0)
                    await _context.SaveChangesAsync();

                var message = $"{coloursToInsert.Count} inserted, {updatedCount} already existed.";

                if (skippedRows.Any())
                    message += $" Skipped rows: {string.Join(",", skippedRows)}";

                return Ok(message);
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message;
                return BadRequest($"Import failed: {ex.Message} | SQL Error: {inner}");
            }
        }
    }
}