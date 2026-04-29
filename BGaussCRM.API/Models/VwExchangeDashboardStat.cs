using System;
using System.Collections.Generic;

namespace BGaussCRM.API.Models;

public partial class VwExchangeDashboardStat
{
    public int? TotalCases { get; set; }

    public int? PendingCount { get; set; }

    public int? ApprovedCount { get; set; }

    public int? RejectedCount { get; set; }

    public int? DraftCount { get; set; }

    public int? ThisWeekCount { get; set; }
}
