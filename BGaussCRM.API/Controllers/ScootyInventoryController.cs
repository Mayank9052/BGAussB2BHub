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
        private readonly IWebHostEnvironment _environment;

        public ScootyInventoryController(AppDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        // =============================
        // GET ALL INVENTORY
        // =============================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Include(x => x.Colour)
                .Select(x => new
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
                })
                .ToListAsync();

            return Ok(data);
        }

        // =============================
        // GET INVENTORY BY ID
        // =============================
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var data = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Include(x => x.Colour)
                .FirstOrDefaultAsync(x => x.ScootyId == id);

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        // =============================
        // POST INVENTORY
        // =============================

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
                string? imagePath = null;

                if (image != null && image.Length > 0)
                {
                    var rootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

                    string folderPath = Path.Combine(rootPath, "ScootyInventoryImage");

                    if (!Directory.Exists(folderPath))
                        Directory.CreateDirectory(folderPath);

                    string fileName = Guid.NewGuid() + Path.GetExtension(image.FileName);

                    string filePath = Path.Combine(folderPath, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await image.CopyToAsync(stream);
                    }

                    imagePath = "/ScootyInventoryImage/" + fileName;
                }

                var inventory = new ScootyInventory
                {
                    ModelId = modelId,
                    VariantId = variantId,
                    ColourId = colourId,
                    Price = price,
                    BatterySpecs = batterySpecs,
                    RangeKm = rangeKm,
                    StockAvailable = stockAvailable,
                    ImageUrl = imagePath
                };

                _context.ScootyInventories.Add(inventory);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Scooty item added successfully",
                    data = inventory
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // =============================
        // UPDATE INVENTORY
        // =============================
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
    var existing = await _context.ScootyInventories.FindAsync(id);

    if (existing == null)
        return NotFound();

    existing.ModelId = modelId;
    existing.VariantId = variantId;
    existing.ColourId = colourId;
    existing.Price = price;
    existing.BatterySpecs = batterySpecs;
    existing.RangeKm = rangeKm;
    existing.StockAvailable = stockAvailable;

    if (image != null)
    {
        var imagePath = SaveImage(image);
        existing.ImageUrl = imagePath;
    }

    await _context.SaveChangesAsync();

    return Ok(existing);
}

        // =============================
        // DELETE INVENTORY
        // =============================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.ScootyInventories.FindAsync(id);

            if (data == null)
                return NotFound();

            _context.ScootyInventories.Remove(data);
            await _context.SaveChangesAsync();

            return Ok("Deleted successfully");
        }

        // =============================
        // SAVE IMAGE
        // =============================
        private string SaveImage(IFormFile image)
        {
            string folderPath = Path.Combine(_environment.WebRootPath, "ScootyInventoryImage");

            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            string fileName = Guid.NewGuid() + Path.GetExtension(image.FileName);

            string filePath = Path.Combine(folderPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                image.CopyTo(stream);
            }

            return "/ScootyInventoryImage/" + fileName;
        }

        // =============================
        // GET MODELS (DROPDOWN)
        // =============================
        [HttpGet("models")]
        public async Task<IActionResult> GetModels()
        {
            var models = await _context.VehicleModels
                .Select(x => new
                {
                    x.Id,
                    x.ModelName
                })
                .ToListAsync();

            return Ok(models);
        }

        // =============================
        // GET VARIANTS BY MODEL
        // =============================
        [HttpGet("variants/{modelId}")]
        public async Task<IActionResult> GetVariants(int modelId)
        {
            var variants = await _context.VehicleVariants
                .Where(x => x.ModelId == modelId)
                .Select(x => new
                {
                    x.Id,
                    x.VariantName
                })
                .ToListAsync();

            return Ok(variants);
        }

        // =============================
        // GET COLOURS BY MODEL + VARIANT
        // =============================
        [HttpGet("colours")]
        public async Task<IActionResult> GetColours(int modelId, int variantId)
        {
            var colours = await _context.VehicleColours
                .Where(x => x.ModelId == modelId && x.VariantId == variantId)
                .Select(x => new
                {
                    x.Id,
                    x.ColourName
                })
                .ToListAsync();

            return Ok(colours);
        }

        // =============================
        // GET UNIQUE MODEL LIST (ONLY 1 IMAGE PER MODEL)
        // =============================
        [HttpGet("models-list")]
        public async Task<IActionResult> GetUniqueModels()
        {
            var data = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Where(x => x.ImageUrl != null) // only records with image
                .GroupBy(x => x.ModelId)
                .Select(g => g
                    .OrderByDescending(x => x.ScootyId) // latest image
                    .Select(x => new
                    {
                        ScootyId = x.ScootyId,   // IMPORTANT for click
                        ModelId = x.ModelId,
                        ModelName = x.Model.ModelName,
                        VariantName = x.Variant.VariantName,
                        ImageUrl = x.ImageUrl,
                        StockAvailable = x.StockAvailable,
                        Price = x.Price
                    })
                    .FirstOrDefault()
                )
                .ToListAsync();

            return Ok(data);
        }

        // =============================
        // GET DETAILS FOR CLICKED SCOOTY ONLY
        // =============================
        [HttpGet("details/{id}")]
        public async Task<IActionResult> GetScootyDetails(int id)
        {
            var data = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Include(x => x.Colour)
                .Where(x => x.ScootyId == id)
                .Select(x => new
                {
                    x.ImageUrl,
                    x.ScootyId,

                    ModelName = x.Model.ModelName,
                    VariantName = x.Variant.VariantName,
                    ColourName = x.Colour != null ? x.Colour.ColourName : null,

                    x.Price,
                    x.BatterySpecs,
                    x.RangeKm,
                    x.StockAvailable
                    
                })
                .FirstOrDefaultAsync();

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        // =============================
        // SHARE ACTIVE SCOOTY DETAILS
        // =============================
        [HttpGet("share/{id}")]
        public async Task<IActionResult> ShareScooty(int id)
        {
            var data = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Include(x => x.Colour)
                .Where(x => x.ScootyId == id && x.StockAvailable == true) // ONLY ACTIVE
                .Select(x => new
                {
                    Title = x.Model.ModelName + " " + x.Variant.VariantName,

                    Model = x.Model.ModelName,
                    Variant = x.Variant.VariantName,
                    Colour = x.Colour != null ? x.Colour.ColourName : null,

                    Price = x.Price,
                    Range = x.RangeKm,
                    Battery = x.BatterySpecs,

                    ImageUrl = x.ImageUrl,

                    // Share Text (READY TO USE)
                    ShareText =
                        "Scooty Details:\n" +
                        "Model: " + x.Model.ModelName + "\n" +
                        "Variant: " + x.Variant.VariantName + "\n" +
                        "Price: ₹" + x.Price + "\n" +
                        "Range: " + x.RangeKm + " km\n" +
                        "Battery: " + x.BatterySpecs
                })
                .FirstOrDefaultAsync();

            if (data == null)
                return NotFound("Scooty not found or not active");

            return Ok(data);
        }

        // =============================
        // DOWNLOAD EXCEL TEMPLATE
        // =============================
        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            using var package = new ExcelPackage();

            var sheet = package.Workbook.Worksheets.Add("ScootyInventory");

            sheet.Cells[1, 1].Value = "ModelId";
            sheet.Cells[1, 2].Value = "VariantId";
            sheet.Cells[1, 3].Value = "ColourId";
            sheet.Cells[1, 4].Value = "Price";
            sheet.Cells[1, 5].Value = "BatterySpecs";
            sheet.Cells[1, 6].Value = "RangeKm";
            sheet.Cells[1, 7].Value = "StockAvailable";

            var stream = new MemoryStream(package.GetAsByteArray());

            return File(stream,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "ScootyInventoryTemplate.xlsx");
        }

        // =============================
        // IMPORT EXCEL
        // =============================
        [HttpPost("import")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var inventoryToInsert = new List<ScootyInventory>();
            int updatedCount = 0;
            var skippedRows = new List<int>();

            var existingInventory = await _context.ScootyInventories.ToListAsync();

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
                var modelIdText = sheet.Cells[row, 1].Text;
                var variantIdText = sheet.Cells[row, 2].Text;
                var colourIdText = sheet.Cells[row, 3].Text;
                var priceText = sheet.Cells[row, 4].Text;
                var batterySpecs = sheet.Cells[row, 5].Text;
                var rangeText = sheet.Cells[row, 6].Text;
                var stockText = sheet.Cells[row, 7].Text;

                if (!int.TryParse(modelIdText, out int modelId) ||
                    !int.TryParse(variantIdText, out int variantId))
                {
                    skippedRows.Add(row);
                    continue;
                }

                int? colourId = int.TryParse(colourIdText, out int cId) ? cId : null;
                decimal? price = decimal.TryParse(priceText, out decimal p) ? p : null;
                int? rangeKm = int.TryParse(rangeText, out int r) ? r : null;
                bool stock = stockText == "1" || stockText.ToLower() == "true";

                var existing = existingInventory.FirstOrDefault(x =>
                    x.ModelId == modelId &&
                    x.VariantId == variantId &&
                    x.ColourId == colourId);

                if (existing != null)
                {
                    existing.Price = price;
                    existing.BatterySpecs = batterySpecs;
                    existing.RangeKm = rangeKm;
                    existing.StockAvailable = stock;

                    updatedCount++;
                    continue;
                }

                var inventory = new ScootyInventory
                {
                    ModelId = modelId,
                    VariantId = variantId,
                    ColourId = colourId,
                    Price = price,
                    BatterySpecs = batterySpecs,
                    RangeKm = rangeKm,
                    StockAvailable = stock
                };

                inventoryToInsert.Add(inventory);
            }

            if (inventoryToInsert.Any())
                await _context.ScootyInventories.AddRangeAsync(inventoryToInsert);

            if (inventoryToInsert.Any() || updatedCount > 0)
                await _context.SaveChangesAsync();

            var message = $"{inventoryToInsert.Count} inserted, {updatedCount} updated.";

            if (skippedRows.Any())
                message += $" Skipped rows: {string.Join(",", skippedRows)}";

            return Ok(message);
        }
    }
}