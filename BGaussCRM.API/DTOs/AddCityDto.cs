namespace BGaussCRM.API.DTOs
{

    public class AddCityDto
    {
        public string CityName { get; set; } = "";
        public string? StateName { get; set; }
        public bool IsPopular { get; set; }
    }
}