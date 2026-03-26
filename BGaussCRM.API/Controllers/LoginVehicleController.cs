using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BGaussCRM.API.Data;

namespace BGaussCRM.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LoginVehicleController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LoginVehicleController(AppDbContext context)
        {
            _context = context;
        }

        // =============================
        // GET VEHICLE MODELS FOR LOGIN PAGE
        // =============================
        [HttpGet("models")]
        public async Task<IActionResult> GetLoginModels()
        {
            var data = await _context.ScootyInventories
                .Include(x => x.Model)
                .Include(x => x.Variant)
                .Where(x => x.StockAvailable == true)   // only active stock
                .GroupBy(x => x.ModelId)
                .Select(g => g
                    .OrderByDescending(x => x.ScootyId)  // latest entry
                    .Select(x => new
                    {
                        x.ScootyId,
                        x.ModelId,
                        ModelName  = x.Model.ModelName,
                        VariantName = x.Variant.VariantName,
                        Price      = x.Price,
                        ImageUrl   = x.ImageUrl
                    })
                    .FirstOrDefault()
                )
                .ToListAsync();

            return Ok(data);
        }
    }
}