using System;
using System.Collections.Generic;

namespace BGaussCRM.API.Models;

public partial class VehicleBrochure
{
    public int Id { get; set; }

    public int ModelId { get; set; }

    public string BrochureUrl { get; set; } = null!;

    public DateTime UploadedAt { get; set; }

    public virtual VehicleModel Model { get; set; } = null!;
}
