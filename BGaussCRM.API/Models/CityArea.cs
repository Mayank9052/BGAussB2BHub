using System;
using System.Collections.Generic;

namespace BGaussCRM.API.Models;

public partial class CityArea
{
    public int Id { get; set; }

    public int CityId { get; set; }

    public string AreaName { get; set; } = null!;

    public string Pincode { get; set; } = null!;

    public virtual ICollection<AreaScootyStock> AreaScootyStocks { get; set; } = new List<AreaScootyStock>();

    public virtual City City { get; set; } = null!;
}
