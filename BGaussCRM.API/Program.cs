using Microsoft.EntityFrameworkCore;
using BGaussCRM.API.Data;
using OfficeOpenXml;
using BGaussCRM.API.ModelBinders;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using BGaussCRM.API.Interfaces;
using BGaussCRM.API.Services;

var builder = WebApplication.CreateBuilder(args);

// EPPlus License
ExcelPackage.License.SetNonCommercialPersonal("BGaussCRM");

// ── Database ──────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);
builder.Services.AddScoped<IExchangeEmailService, ExchangeEmailService>();
// ── Controllers ───────────────────────────────────────────────
builder.Services.AddControllers(options =>
{
    options.ModelBinderProviders.Insert(0, new DateOnlyModelBinderProvider());
});

// ── JWT Authentication ────────────────────────────────────────
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

// ── Swagger ───────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── CORS — allow localhost dev + production IP ────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://34.203.61.70",          // your EC2 IP
                "http://34.203.61.70:80",
                "http://34.203.61.70:443"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// ── Explicit WebRootPath so uploads work on Linux/AWS ─────────
// When published, wwwroot must be set to the folder that actually
// exists next to the executable. Setting it here guarantees
// IWebHostEnvironment.WebRootPath is never null in controllers.
var wwwrootPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
if (!Directory.Exists(wwwrootPath))
{
    Directory.CreateDirectory(wwwrootPath);
}
builder.Environment.WebRootPath = wwwrootPath;

var app = builder.Build();

// ── Swagger (all environments for now — restrict later if needed) ──
app.UseSwagger();
app.UseSwaggerUI();

// ── Serve React build from wwwroot ────────────────────────────
app.UseDefaultFiles();
app.UseStaticFiles();

var possibleImageRoots = new[]
{
    app.Environment.WebRootPath,
    Path.Combine(app.Environment.ContentRootPath, "wwwroot"),
    Path.Combine(Path.GetTempPath(), "bgauss-uploads"),
};

foreach (var root in possibleImageRoots.Where(r => !string.IsNullOrWhiteSpace(r)))
{
    var imgFolder = Path.Combine(root, "ExchangeImages");
    if (!Directory.Exists(imgFolder))
    {
        try { Directory.CreateDirectory(imgFolder); } catch { /* ignore */ }
    }

    if (Directory.Exists(imgFolder))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(imgFolder),
            RequestPath  = "/ExchangeImages",
            OnPrepareResponse = ctx =>
            {
                // Cache images for 1 hour, allow CORS for same origin
                ctx.Context.Response.Headers["Cache-Control"] = "public,max-age=3600";
                ctx.Context.Response.Headers["Access-Control-Allow-Origin"] = "*";
            }
        });

        // Log which root is active so you can verify in server logs
        Console.WriteLine($"[ExchangeImages] Serving static files from: {imgFolder}");
        break; // use first valid root only to avoid duplicate middleware conflicts
    }
}

app.UseRouting();
// ── CORS — apply to ALL environments ─────────────────────────
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── React routing fallback ────────────────────────────────────
app.MapFallbackToFile("index.html");

app.Run();