using System;
using System.Collections.Generic;
using BGaussCRM.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BGaussCRM.API.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<B2bcustomer> B2bcustomers { get; set; }

    public virtual DbSet<PriceMaster> PriceMasters { get; set; }

    public virtual DbSet<SalesOrder> SalesOrders { get; set; }

    public virtual DbSet<ScootyInventory> ScootyInventories { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<VehicleColour> VehicleColours { get; set; }

    public virtual DbSet<VehicleModel> VehicleModels { get; set; }

    public virtual DbSet<VehicleVariant> VehicleVariants { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer("Name=ConnectionStrings:DefaultConnection");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<B2bcustomer>(entity =>
        {
            entity.HasKey(e => e.CustomerId).HasName("PK__B2BCusto__A4AE64B836156658");

            entity.ToTable("B2BCustomers");

            entity.HasIndex(e => e.Email, "UQ_B2BCustomers_Email").IsUnique();

            entity.HasIndex(e => e.Gstnumber, "UQ_B2BCustomers_GST").IsUnique();

            entity.Property(e => e.CustomerId).HasColumnName("CustomerID");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.CompanyName)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.ContactPerson)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Gstnumber)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("GSTNumber");
            entity.Property(e => e.LogoPath)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .IsUnicode(false);
        });

        modelBuilder.Entity<PriceMaster>(entity =>
        {
            entity.HasKey(e => e.PriceId).HasName("PK__PriceMas__4957584F98AE03AF");

            entity.ToTable("PriceMaster");

            entity.HasIndex(e => new { e.ModelId, e.VariantId }, "IDX_PriceMaster_Model_Variant");

            entity.HasIndex(e => new { e.ModelId, e.VariantId, e.EffectiveStartDate }, "UQ_PriceMaster_Model_Variant_StartDate").IsUnique();

            entity.Property(e => e.PriceId).HasColumnName("PriceID");
            entity.Property(e => e.Price).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.PriceListFile)
                .HasMaxLength(255)
                .IsUnicode(false);

            entity.HasOne(d => d.Model).WithMany(p => p.PriceMasters)
                .HasForeignKey(d => d.ModelId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__PriceMast__Model__66603565");

            entity.HasOne(d => d.Variant).WithMany(p => p.PriceMasters)
                .HasForeignKey(d => d.VariantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__PriceMast__Varia__6754599E");
        });

        modelBuilder.Entity<SalesOrder>(entity =>
        {
            entity.HasKey(e => e.OrderId).HasName("PK__SalesOrd__C3905BAF31957483");

            entity.HasIndex(e => e.CustomerId, "IDX_SalesOrders_CustomerID");

            entity.HasIndex(e => e.ScootyId, "IDX_SalesOrders_ScootyID");

            entity.Property(e => e.OrderId).HasColumnName("OrderID");
            entity.Property(e => e.CustomerId).HasColumnName("CustomerID");
            entity.Property(e => e.OrderDate).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.ScootyId).HasColumnName("ScootyID");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(12, 2)");

            entity.HasOne(d => d.Customer).WithMany(p => p.SalesOrders)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__SalesOrde__Custo__6D0D32F4");

            entity.HasOne(d => d.Scooty).WithMany(p => p.SalesOrders)
                .HasForeignKey(d => d.ScootyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__SalesOrde__Scoot__6E01572D");
        });

        modelBuilder.Entity<ScootyInventory>(entity =>
        {
            entity.HasKey(e => e.ScootyId).HasName("PK__ScootyIn__03A960B0B6CC067B");

            entity.ToTable("ScootyInventory");

            entity.HasIndex(e => new { e.ModelId, e.VariantId }, "IDX_Scooty_Model_Variant");

            entity.HasIndex(e => new { e.ModelId, e.VariantId, e.ColourId }, "UQ_Scooty_Model_Variant_Color").IsUnique();

            entity.Property(e => e.ScootyId).HasColumnName("ScootyID");
            entity.Property(e => e.BatterySpecs)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("ImageURL");
            entity.Property(e => e.Price).HasColumnType("decimal(10, 2)");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
