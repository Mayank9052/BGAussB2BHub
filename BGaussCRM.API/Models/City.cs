using System;
using System.Collections.Generic;

namespace BGaussCRM.API.Models;

public partial class City
{
    public int Id { get; set; }

    public string CityName { get; set; } = null!;

    public string StateName { get; set; } = null!;

    public bool IsPopular { get; set; }

    public virtual ICollection<RoadPrice> RoadPrices { get; set; } = new List<RoadPrice>();
}
