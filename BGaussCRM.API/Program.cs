using Microsoft.EntityFrameworkCore;
using BGaussCRM.API.Data;
using OfficeOpenXml;
using BGaussCRM.API.ModelBinders;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// EPPlus License
ExcelPackage.License.SetNonCommercialPersonal("BGaussCRM");

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Controllers
builder.Services.AddControllers(options =>
{
    options.ModelBinderProviders.Insert(0, new DateOnlyModelBinderProvider());
});

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience            = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Key"]!))
        };
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── CORS: allow both dev origins AND production IP ────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://34.203.61.70",
                "http://34.203.61.70:5173",
                "http://34.203.61.70:80"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// ── Pre-create wwwroot + upload folders so they always exist ──
var wwwrootPath      = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
var exchangeImgPath  = Path.Combine(wwwrootPath, "ExchangeImages");
var scootyImgPath    = Path.Combine(wwwrootPath, "ScootyInventoryImage");
var uploadImgPath    = Path.Combine(wwwrootPath, "images");

foreach (var dir in new[] { wwwrootPath, exchangeImgPath, scootyImgPath, uploadImgPath })
{
    if (!Directory.Exists(dir))
        Directory.CreateDirectory(dir);
}

// Tell ASP.NET where wwwroot is (fixes WebRootPath being null)
builder.Environment.WebRootPath = wwwrootPath;

var app = builder.Build();

// ── Swagger (dev only) ────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ── CORS must be before auth + routing ───────────────────────
app.UseCors("AllowAll");

// ── Static files (serves wwwroot — React build + uploaded images) ──
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ── React SPA fallback ────────────────────────────────────────
app.MapFallbackToFile("index.html");

app.Run();