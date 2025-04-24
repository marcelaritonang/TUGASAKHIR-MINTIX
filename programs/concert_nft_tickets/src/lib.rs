use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("3oKZi6zmYzbRDuq8nAAGeL9m9TcwFPAiR2cfz4vjANum");

// Batasi ukuran string untuk mengurangi kebutuhan stack
const MAX_NAME_LEN: usize = 50;
const MAX_VENUE_LEN: usize = 50;
const MAX_DATE_LEN: usize = 10;
const MAX_TYPE_LEN: usize = 20;
const MAX_SEAT_LEN: usize = 10;

#[program]
pub mod concert_nft_tickets {
    use super::*;

    pub fn initialize_concert(ctx: Context<InitializeConcert>, 
                      name: String, 
                      venue: String, 
                      date: String, 
                      total_tickets: u16) -> Result<()> {
        // Validasi panjang input
        if name.len() > MAX_NAME_LEN || venue.len() > MAX_VENUE_LEN || date.len() > MAX_DATE_LEN {
            return err!(ErrorCode::StringTooLong);
        }
        
        let concert = &mut ctx.accounts.concert;
        concert.authority = ctx.accounts.authority.key();
        concert.name = name;
        concert.venue = venue;
        concert.date = date;
        concert.total_tickets = total_tickets;
        concert.tickets_sold = 0;
        
        msg!("Concert initialized: {}", concert.name);
        Ok(())
    }

    pub fn initialize_mint(_ctx: Context<InitializeMint>) -> Result<()> {
        msg!("Mint initialized");
        Ok(())
    }

    pub fn create_ticket(
        ctx: Context<CreateTicket>,
        ticket_type: String,
        seat_number: Option<String>,
    ) -> Result<()> {
        // Validasi panjang input
        if ticket_type.len() > MAX_TYPE_LEN || 
           (seat_number.is_some() && seat_number.as_ref().unwrap().len() > MAX_SEAT_LEN) {
            return err!(ErrorCode::StringTooLong);
        }
        
        // Tingkatkan validasi
        if ctx.accounts.concert.tickets_sold >= ctx.accounts.concert.total_tickets {
            return err!(ErrorCode::SoldOut);
        }
        
        // Pembaruan jumlah tiket dengan safe math
        let tickets_sold = ctx.accounts.concert.tickets_sold.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        ctx.accounts.concert.tickets_sold = tickets_sold;

        // Minting token
        mint_nft_token(
            &ctx.accounts.mint,
            &ctx.accounts.token_account,
            &ctx.accounts.authority,
            &ctx.accounts.token_program
        )?;
        
        // Penyimpanan data tiket
        save_ticket_data(
            &mut ctx.accounts.ticket,
            &ctx.accounts.buyer,
            &ctx.accounts.mint,
            &ctx.accounts.concert,
            ticket_type,
            seat_number
        )?;
        
        msg!("Tiket konser berhasil dibuat untuk: {}", ctx.accounts.concert.name);
        Ok(())
    }

    pub fn use_ticket(ctx: Context<UseTicket>) -> Result<()> {
        let ticket = &mut ctx.accounts.ticket;
        
        if ticket.used {
            return err!(ErrorCode::TicketAlreadyUsed);
        }
        
        ticket.used = true;
        
        msg!("Tiket berhasil digunakan!");
        Ok(())
    }

    pub fn delete_concert(ctx: Context<DeleteConcert>) -> Result<()> {
        // Admin pubkey 
        let admin_pubkey_str = "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU";
        
        // Verifikasi bahwa penghapus adalah pemilik konser ATAU admin global
        let concert = &ctx.accounts.concert;
        let authority = &ctx.accounts.authority;
        
        // Cek apakah pengguna adalah pemilik konser
        let is_owner = concert.authority == authority.key();
        
        // Cek apakah pengguna adalah admin global
        let is_admin = authority.key().to_string() == admin_pubkey_str;
        
        if !is_owner && !is_admin {
            msg!("Pengguna bukan pemilik concert atau admin global");
            return err!(ErrorCode::Unauthorized);
        }
        
        // Log informasi penghapusan
        if is_admin {
            msg!("Admin menghapus konser: {}", concert.name);
        } else {
            msg!("Pemilik menghapus konser: {}", concert.name);
        }
        
        Ok(())
    }

    pub fn update_concert(
        ctx: Context<UpdateConcert>,
        name: String,
        venue: String,
        date: String,
        total_tickets: u16
    ) -> Result<()> {
        // Validasi panjang input
        if name.len() > MAX_NAME_LEN || venue.len() > MAX_VENUE_LEN || date.len() > MAX_DATE_LEN {
            return err!(ErrorCode::StringTooLong);
        }

        // Admin pubkey
        let admin_pubkey_str = "2upQ693dMu2PEdBp6JKnxRBWEimdbmbgNCvncbasP6TU";
        
        // Verifikasi bahwa pengubah adalah pemilik konser ATAU admin global
        let concert = &mut ctx.accounts.concert;
        let authority = &ctx.accounts.authority;
        
        // Cek apakah pengguna adalah pemilik konser
        let is_owner = concert.authority == authority.key();
        
        // Cek apakah pengguna adalah admin global
        let is_admin = authority.key().to_string() == admin_pubkey_str;
        
        if !is_owner && !is_admin {
            msg!("Pengguna bukan pemilik concert atau admin global");
            return err!(ErrorCode::Unauthorized);
        }

        // Jika total tiket baru lebih kecil dari yang sudah terjual, tolak
        if total_tickets < concert.tickets_sold {
            return err!(ErrorCode::ArithmeticOverflow);
        }
        
        // Update concert data
        concert.name = name;
        concert.venue = venue;
        concert.date = date;
        concert.total_tickets = total_tickets;
        
        // Log informasi update
        if is_admin {
            msg!("Admin mengupdate konser: {}", concert.name);
        } else {
            msg!("Pemilik mengupdate konser: {}", concert.name);
        }
        
        Ok(())
    }
}

// Fungsi helper untuk mengurangi ukuran fungsi utama
fn mint_nft_token<'info>(
    mint: &Account<'info, Mint>,
    token_account: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let cpi_accounts = token::MintTo {
        mint: mint.to_account_info(),
        to: token_account.to_account_info(),
        authority: authority.to_account_info(),
    };
    
    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::mint_to(cpi_ctx, 1)?;
    Ok(())
}

fn save_ticket_data<'info>(
    ticket: &mut Account<'info, Ticket>,
    buyer: &Signer<'info>,
    mint: &Account<'info, Mint>,
    concert: &Account<'info, Concert>,
    ticket_type: String,
    seat_number: Option<String>,
) -> Result<()> {
    ticket.owner = buyer.key();
    ticket.mint = mint.key();
    ticket.concert = concert.key();
    ticket.ticket_type = ticket_type;
    ticket.seat_number = seat_number;
    ticket.used = false;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConcert<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + MAX_NAME_LEN + MAX_VENUE_LEN + MAX_DATE_LEN + 2 + 2
    )]
    pub concert: Account<'info, Concert>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = authority,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = buyer,
        token::mint = mint,
        token::authority = buyer,
    )]
    pub token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateTicket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub concert: Account<'info, Concert>,  // Hapus has_one constraint
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = buyer,
        space = 8 + 32 + 32 + 32 + MAX_TYPE_LEN + MAX_SEAT_LEN + 1
    )]
    pub ticket: Account<'info, Ticket>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UseTicket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        constraint = ticket.owner == authority.key() @ ErrorCode::NotTicketOwner
    )]
    pub ticket: Account<'info, Ticket>,
}

#[derive(Accounts)]
pub struct DeleteConcert<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        close = authority
        // Hapus constraint di sini, karena logika izin sudah ditangani di fungsi
    )]
    pub concert: Account<'info, Concert>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConcert<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub concert: Account<'info, Concert>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Concert {
    pub authority: Pubkey,      // Penyelenggara konser
    pub name: String,           // Nama konser
    pub venue: String,          // Lokasi konser
    pub date: String,           // Tanggal konser
    pub total_tickets: u16,     // Total tiket yang tersedia
    pub tickets_sold: u16,      // Jumlah tiket yang terjual
}

#[account]
pub struct Ticket {
    pub owner: Pubkey,          // Pemilik tiket
    pub mint: Pubkey,           // Token mint untuk NFT tiket
    pub concert: Pubkey,        // Referensi ke konser
    pub ticket_type: String,    // Tipe tiket (VIP, Regular, dll)
    pub seat_number: Option<String>, // Nomor kursi (opsional)
    pub used: bool,             // Status apakah tiket sudah digunakan
}

#[error_code]
pub enum ErrorCode {
    #[msg("Tiket konser sudah habis terjual")]
    SoldOut,
    
    #[msg("Tiket sudah digunakan")]
    TicketAlreadyUsed,
    
    #[msg("Bukan pemilik tiket")]
    NotTicketOwner,
    
    #[msg("String terlalu panjang")]
    StringTooLong,
    
    #[msg("Overflow aritmatika")]
    ArithmeticOverflow,
    
    #[msg("Tidak berwenang untuk operasi ini")]
    Unauthorized,
}