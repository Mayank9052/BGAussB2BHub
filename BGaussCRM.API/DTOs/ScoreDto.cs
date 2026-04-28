namespace BGaussCRM.API.DTOs;

public class ScoreDto
    {
        public string Category  { get; set; } = string.Empty;
        public string Parameter { get; set; } = string.Empty;
        public int Score    { get; set; }
    }