using BGaussCRM.API.Data;
using BGaussCRM.API.DTOs;
using BGaussCRM.API.Models;
using Microsoft.AspNetCore.Mvc;

namespace BGaussCRM.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomerRequestsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateCustomerRequest([FromBody] CreateCustomerRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var request = new CustomerRequest
                {
                    CustomerName = dto.CustomerName?.Trim() ?? string.Empty,
                    MobileNumber = dto.MobileNumber?.Trim() ?? string.Empty,
                    Email = dto.Email?.Trim(),
                    City = dto.City?.Trim() ?? string.Empty,
                    State = dto.State?.Trim(),
                    Gender = dto.Gender?.Trim(),
                    PreferredModel = dto.PreferredModel?.Trim(),
                    RequestType = dto.RequestType?.Trim(),
                    PreferredContact = dto.PreferredContact?.Trim(),
                    Notes = dto.Notes?.Trim(),
                };

                _context.CustomerRequests.Add(request);
                await _context.SaveChangesAsync();

                return Ok(request);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.InnerException?.Message ?? ex.Message);
            }
        }
    }
}
