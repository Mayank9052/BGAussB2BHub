using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using BGaussCRM.API.Data;
using BGaussCRM.API.Models;

namespace BGaussCRM.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScootyInventoryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public ScootyInventoryController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // ================================
        // GET ALL
        // ================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Include(x => x.Colour)
                .Select(x => MapToDto(x))
                .ToListAsync();

            return Ok(data);
        }

        // ================================
        // GET BY ID
        // ================================
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var item = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Include(x => x.Colour)
                .FirstOrDefaultAsync(x => x.ScootyId == id);

            if (item == null)
                return NotFound();

            return Ok(item);
        }

        // ================================
        // ADD
        // ================================
        [HttpPost("add-item")]
        public async Task<IActionResult> AddItem(
            [FromForm] int modelId,
            [FromForm] int variantId,
            [FromForm] int? colourId,
            [FromForm] decimal? price,
            [FromForm] string? batterySpecs,
            [FromForm] int? rangeKm,
            [FromForm] bool stockAvailable,
            [FromForm] IFormFile? image)
        {
            try
            {
                var inventory = new ScootyInventory
                {
                    ModelId = modelId,
                    VariantId = variantId,
                    ColourId = colourId,
                    Price = price,
                    BatterySpecs = batterySpecs,
                    RangeKm = rangeKm,
                    StockAvailable = stockAvailable,
                    ImageUrl = await SaveImageAsync(image)
                };

                _context.ScootyInventories.Add(inventory);
                await _context.SaveChangesAsync();

                return Ok(inventory);
            }
            catch (Exception ex)
            {
                return BadRequest(GetError(ex));
            }
        }

        // ================================
        // UPDATE
        // ================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            [FromForm] int modelId,
            [FromForm] int variantId,
            [FromForm] int? colourId,
            [FromForm] decimal? price,
            [FromForm] string? batterySpecs,
            [FromForm] int? rangeKm,
            [FromForm] bool stockAvailable,
            [FromForm] IFormFile? image)
        {
            try
            {
                var existing = await _context.ScootyInventories.FindAsync(id);
                if (existing == null) return NotFound();

                existing.ModelId = modelId;
                existing.VariantId = variantId;
                existing.ColourId = colourId;
                existing.Price = price;
                existing.BatterySpecs = batterySpecs;
                existing.RangeKm = rangeKm;
                existing.StockAvailable = stockAvailable;

                if (image != null)
                    existing.ImageUrl = await SaveImageAsync(image);

                await _context.SaveChangesAsync();

                return Ok(existing);
            }
            catch (Exception ex)
            {
                return BadRequest(GetError(ex));
            }
        }

        // ================================
        // DELETE
        // ================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var item = await _context.ScootyInventories.FindAsync(id);
                if (item == null) return NotFound();

                _context.ScootyInventories.Remove(item);
                await _context.SaveChangesAsync();

                return Ok("Deleted successfully");
            }
            catch (Exception ex)
            {
                return BadRequest(GetError(ex));
            }
        }

        // ================================
        // DROPDOWNS
        // ================================
        [HttpGet("models")]
        public async Task<IActionResult> GetModels()
        {
            return Ok(await _context.VehicleModels
                .Select(x => new { x.Id, x.ModelName })
                .ToListAsync());
        }

        [HttpGet("variants/{modelId}")]
        public async Task<IActionResult> GetVariants(int modelId)
        {
            return Ok(await _context.VehicleVariants
                .Where(x => x.ModelId == modelId)
                .Select(x => new { x.Id, x.VariantName })
                .ToListAsync());
        }

        [HttpGet("colours")]
        public async Task<IActionResult> GetColours(int modelId, int variantId)
        {
            return Ok(await _context.VehicleColours
                .Where(x => x.ModelId == modelId && x.VariantId == variantId)
                .Select(x => new { x.Id, x.ColourName })
                .ToListAsync());
        }

        // ================================
        // EXCEL TEMPLATE
        // ================================
        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            using var package = new ExcelPackage();
            var sheet = package.Workbook.Worksheets.Add("ScootyInventory");

            string[] headers = {
                "ModelId", "VariantId", "ColourId",
                "Price", "BatterySpecs", "RangeKm", "StockAvailable"
            };

            for (int i = 0; i < headers.Length; i++)
                sheet.Cells[1, i + 1].Value = headers[i];

            return File(
                new MemoryStream(package.GetAsByteArray()),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "ScootyInventoryTemplate.xlsx"
            );
        }

        // ================================
        // HELPERS
        // ================================
        private object MapToDto(ScootyInventory x) => new
        {
            x.ScootyId,
            x.ModelId,
            ModelName = x.Model.ModelName,
            x.VariantId,
            VariantName = x.Variant.VariantName,
            x.ColourId,
            ColourName = x.Colour != null ? x.Colour.ColourName : null,
            x.Price,
            x.BatterySpecs,
            x.RangeKm,
            x.StockAvailable,
            x.ImageUrl
        };

        private async Task<string?> SaveImageAsync(IFormFile? image)
        {
            if (image == null || image.Length == 0)
                return null;

            var root = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var folder = Path.Combine(root, "ScootyInventoryImage");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var fileName = Guid.NewGuid() + Path.GetExtension(image.FileName);
            var path = Path.Combine(folder, fileName);

            using var stream = new FileStream(path, FileMode.Create);
            await image.CopyToAsync(stream);

            return "/ScootyInventoryImage/" + fileName;
        }

        private string GetError(Exception ex)
        {
            return ex.InnerException?.Message ?? ex.Message;
        }
    }
}