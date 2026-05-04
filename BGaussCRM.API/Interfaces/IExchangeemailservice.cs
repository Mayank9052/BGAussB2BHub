// Interfaces/IExchangeEmailService.cs
using BGaussCRM.API.Models;

namespace BGaussCRM.API.Interfaces;

public interface IExchangeEmailService
{
    Task SendCaseSubmissionEmailsAsync(ExchangeCase c, User dealer);
    Task SendAdminActionEmailAsync(ExchangeCase c, User dealer, string action, string? note);
}