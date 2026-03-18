using Microsoft.EntityFrameworkCore;
using BGaussCRM.API.Data;
using OfficeOpenXml;
using BGaussCRM.API.ModelBinders;

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

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS (only for development)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactDev",
        policy => policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});

var app = builder.Build();

// Swagger only in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ⚠️ Keep HTTPS only if needed (IIS handles HTTPS usually)
app.UseHttpsRedirection();

// Serve React build
app.UseDefaultFiles();
app.UseStaticFiles();

// Use CORS only in development
if (app.Environment.IsDevelopment())
{
    app.UseCors("AllowReactDev");
}

app.UseAuthorization();
app.MapControllers();

// React routing fallback
app.MapFallbackToFile("index.html");

app.Run();