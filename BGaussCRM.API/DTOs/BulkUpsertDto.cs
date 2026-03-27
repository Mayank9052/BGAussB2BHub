namespace BGaussCRM.API.DTOs;

public class BulkUpsertDto
{
    public int ScootyId { get; set; }
    public List<AreaStockItem> Stocks { get; set; } = new();
}