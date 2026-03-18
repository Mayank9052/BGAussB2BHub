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
    // Insert at position 0 to give it highest priority
    options.ModelBinderProviders.Insert(0, new DateOnlyModelBinderProvider());
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactDev",
        policy => policy
            .WithOrigins("http://192.168.68.56:5173","http://localhost:5173") // React dev server
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});

var app = builder.Build();

// Swagger enabled in development and will open automatically
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "BGaussCRM API V1");
        c.RoutePrefix = "swagger"; // Swagger available at /swagger
    });
}

//app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors("AllowReactDev");
app.UseAuthorization();
app.MapControllers();

app.Run();