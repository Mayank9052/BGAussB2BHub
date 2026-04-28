public class CustomerRequest
{
    public int Id { get; set; }

    // Customer Info
    public string CustomerName { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string City { get; set; } = string.Empty;
    public string? State { get; set; }
    public string? Gender { get; set; }

    // Request Details
    public string? PreferredModel { get; set; }
    public string? RequestType { get; set; }
    public string? PreferredContact { get; set; }
    public string? Notes { get; set; }

    // System Fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "New"; // New, InProgress, Closed
}