using System;
using System.Collections.Generic;

namespace BGaussCRM.API.Models;

public partial class ExchangeCaseImage
{
    public int Id { get; set; }

    public int CaseId { get; set; }

    public string ImageType { get; set; } = null!;

    public string ImagePath { get; set; } = null!;

    public DateTime UploadedAt { get; set; }

    public virtual ExchangeCase Case { get; set; } = null!;
}
