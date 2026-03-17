using System;
using System.Collections.Generic;

namespace BGaussCRM.API.Models;

public partial class ScootyInventory
{
    public int ScootyId { get; set; }

    public int ModelId { get; set; }

    public int VariantId { get; set; }

    public int? ColourId { get; set; }

    public decimal? Price { get; set; }

    public string? BatterySpecs { get; set; }

    public int? RangeKm { get; set; }

    public int? StockAvailable { get; set; }

    public string? ImageUrl { get; set; }

    public virtual VehicleColour? Colour { get; set; }

    public virtual VehicleModel Model { get; set; } = null!;

    public virtual ICollection<SalesOrder> SalesOrders { get; set; } = new List<SalesOrder>();

    public virtual VehicleVariant Variant { get; set; } = null!;
}
