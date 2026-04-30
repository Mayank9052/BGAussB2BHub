using System;
using System.Collections.Generic;

namespace BGaussCRM.API.Models;

public partial class ExchangeBatterySlab
{
    public int Id { get; set; }

    public decimal ScoreFrom { get; set; }

    public decimal ScoreTo { get; set; }

    public decimal Adjustment { get; set; }

    public string Label { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
