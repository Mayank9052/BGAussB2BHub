// Interfaces/IExchangeEmailService.cs

using BGaussCRM.API.Models;

namespace BGaussCRM.API.Interfaces;

public interface IExchangeEmailService
{
    /// <summary>
    /// Called after Submit() —
    /// sends dealer ACK + admin approval request in sequence.
    /// </summary>
    Task SendCaseSubmissionEmailsAsync(ExchangeCase exchangeCase, string dealerEmail);

    /// <summary>
    /// Called after AdminAction() or DecideCase() —
    /// sends decision result (Approved / Modified / Rejected) to dealer.
    /// </summary>
    Task SendAdminActionEmailAsync(ExchangeCase exchangeCase, string dealerEmail, string action, string? note);
}