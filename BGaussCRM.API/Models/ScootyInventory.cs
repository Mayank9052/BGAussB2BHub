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

    public bool StockAvailable { get; set; }

    public string? ImageUrl { get; set; }

    public virtual VehicleColour? Colour { get; set; }

    public virtual ICollection<EmiEnquiry> EmiEnquiries { get; set; } = new List<EmiEnquiry>();

    public virtual VehicleModel Model { get; set; } = null!;

    public virtual ICollection<RoadPrice> RoadPrices { get; set; } = new List<RoadPrice>();

    public virtual ICollection<SalesOrder> SalesOrders { get; set; } = new List<SalesOrder>();

    public virtual ICollection<UserLike> UserLikes { get; set; } = new List<UserLike>();

    public virtual VehicleVariant Variant { get; set; } = null!;

    public virtual ICollection<VehicleReview> VehicleReviews { get; set; } = new List<VehicleReview>();
}
