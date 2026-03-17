namespace BGaussCRM.API.DTOs;

public class ResetPasswordRequest
{
    public string Username { get; set; } = null!;
    public string Token { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}