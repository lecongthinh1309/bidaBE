package com.dinhquangha.backend.service;

import com.dinhquangha.backend.model.*;
import com.dinhquangha.backend.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
public class InvoiceService {

    private final TableSessionRepository sessionRepository;
    private final BilliardTableRepository tableRepository;
    private final ProductRepository productRepository;
    private final InvoiceRepository invoiceRepository;

    public InvoiceService(TableSessionRepository sessionRepository,
                          BilliardTableRepository tableRepository,
                          ProductRepository productRepository,
                          InvoiceRepository invoiceRepository) {
        this.sessionRepository = sessionRepository;
        this.tableRepository = tableRepository;
        this.productRepository = productRepository;
        this.invoiceRepository = invoiceRepository;
    }

    public TableSession startSession(Long tableId) {
        Objects.requireNonNull(tableId, "tableId must not be null");

        BilliardTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found"));

        TableSession session = new TableSession();
        session.setTable(table);
        session.setStartTime(LocalDateTime.now());
        session.setTotal(BigDecimal.ZERO);

        table.setStatus(BilliardTable.TableStatus.OCCUPIED);
        // Clear any reservation time when the table session actually starts
        table.setReservationTime(null);
        tableRepository.save(table);

        return sessionRepository.save(session);
    }

    public TableSession endSession(Long tableId) {
        Objects.requireNonNull(tableId, "tableId must not be null");

        TableSession session = sessionRepository.findByTableIdAndEndTimeIsNull(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Active session not found for table"));

        session.setEndTime(LocalDateTime.now());

        BigDecimal minutes = BigDecimal.valueOf(
                Duration.between(session.getStartTime(), session.getEndTime()).toMinutes()
        );

        BigDecimal pricePerHour = Objects.requireNonNull(
                session.getTable().getPricePerHour(),
                "Table pricePerHour must not be null"
        );

        // price per hour -> per minute
        BigDecimal pricePerMinute = pricePerHour
                .divide(BigDecimal.valueOf(60), 6, RoundingMode.HALF_UP);

        BigDecimal amount = pricePerMinute.multiply(minutes)
                .setScale(0, RoundingMode.HALF_UP);

        session.setTotal(amount);
        session.getTable().setStatus(BilliardTable.TableStatus.AVAILABLE);
        tableRepository.save(session.getTable());

        return sessionRepository.save(session);
    }

    public Invoice createInvoiceForSession(Long sessionId) {
        Objects.requireNonNull(sessionId, "sessionId must not be null");

        TableSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        BigDecimal baseTotal = session.getTotal() == null
                ? BigDecimal.ZERO
                : session.getTotal();

        Invoice invoice = new Invoice();
        invoice.setSession(session);
        invoice.setSubtotal(baseTotal);
        invoice.setTotal(baseTotal);

        return invoiceRepository.save(invoice);
    }

    public Optional<Invoice> findInvoiceById(Long invoiceId) {
        Objects.requireNonNull(invoiceId, "invoiceId must not be null");
        return invoiceRepository.findById(invoiceId);
    }

    public Invoice addProductToInvoice(Long invoiceId, Long productId, int quantity) {
        Objects.requireNonNull(invoiceId, "invoiceId must not be null");
        Objects.requireNonNull(productId, "productId must not be null");

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        InvoiceItem item = new InvoiceItem();
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setUnitPrice(product.getPrice());

        BigDecimal unitPrice = product.getPrice() == null
                ? BigDecimal.ZERO
                : product.getPrice();

        item.setLineTotal(unitPrice.multiply(BigDecimal.valueOf(quantity)));

        invoice.getItems().add(item);

        recalcInvoiceTotals(invoice);

        return invoiceRepository.save(invoice);
    }

    public Invoice removeItemFromInvoice(Long invoiceId, Long itemId) {
        Objects.requireNonNull(invoiceId, "invoiceId must not be null");
        Objects.requireNonNull(itemId, "itemId must not be null");

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        boolean removed = invoice.getItems().removeIf(i -> Objects.equals(i.getId(), itemId));
        if (!removed) {
            throw new IllegalArgumentException("Item not found in invoice");
        }

        recalcInvoiceTotals(invoice);

        return invoiceRepository.save(invoice);
    }

    private void recalcInvoiceTotals(Invoice invoice) {
        Objects.requireNonNull(invoice, "invoice must not be null");

        BigDecimal subtotal = invoice.getItems().stream()
                .map(InvoiceItem::getLineTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        invoice.setSubtotal(subtotal);

        // discount amount = subtotal * discountPercent / 100
        BigDecimal discountPercent = invoice.getDiscountPercent() == null
                ? BigDecimal.ZERO
                : invoice.getDiscountPercent();

        BigDecimal discountAmount = subtotal.multiply(discountPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        invoice.setDiscountAmount(discountAmount);

        // taxable amount = subtotal - discount
        BigDecimal taxable = subtotal.subtract(discountAmount);

        BigDecimal taxPercent = invoice.getTaxPercent() == null
                ? BigDecimal.ZERO
                : invoice.getTaxPercent();

        BigDecimal taxAmount = taxable.multiply(taxPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        invoice.setTaxAmount(taxAmount);

        BigDecimal total = taxable.add(taxAmount)
                .setScale(2, RoundingMode.HALF_UP);
        invoice.setTotal(total);
    }

    public Invoice updateItemQuantity(Long invoiceId, Long itemId, int quantity) {
        Objects.requireNonNull(invoiceId, "invoiceId must not be null");
        Objects.requireNonNull(itemId, "itemId must not be null");

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        InvoiceItem target = invoice.getItems().stream()
                .filter(i -> Objects.equals(i.getId(), itemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Item not found in invoice"));

        target.setQuantity(quantity);

        BigDecimal unitPrice = target.getUnitPrice() == null
                ? BigDecimal.ZERO
                : target.getUnitPrice();

        target.setLineTotal(unitPrice.multiply(BigDecimal.valueOf(quantity)));

        recalcInvoiceTotals(invoice);

        return invoiceRepository.save(invoice);
    }

    public Invoice applyDiscountPercent(Long invoiceId, BigDecimal percent) {
        Objects.requireNonNull(invoiceId, "invoiceId must not be null");

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        invoice.setDiscountPercent(percent == null ? BigDecimal.ZERO : percent);

        recalcInvoiceTotals(invoice);

        return invoiceRepository.save(invoice);
    }

    public Invoice applyTaxPercent(Long invoiceId, BigDecimal percent) {
        Objects.requireNonNull(invoiceId, "invoiceId must not be null");

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        invoice.setTaxPercent(percent == null ? BigDecimal.ZERO : percent);

        recalcInvoiceTotals(invoice);

        return invoiceRepository.save(invoice);
    }

        public Page<Invoice> listInvoices(Pageable pageable) {
                return invoiceRepository.findAll(pageable);
        }

        public Invoice createInvoiceWithProduct(Long productId, int quantity) {
                Objects.requireNonNull(productId, "productId must not be null");

                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

                Invoice invoice = new Invoice();

                InvoiceItem item = new InvoiceItem();
                item.setProduct(product);
                item.setQuantity(quantity);
                item.setUnitPrice(product.getPrice());

                BigDecimal unitPrice = product.getPrice() == null ? BigDecimal.ZERO : product.getPrice();
                item.setLineTotal(unitPrice.multiply(BigDecimal.valueOf(quantity)));

                invoice.getItems().add(item);

                recalcInvoiceTotals(invoice);

                return invoiceRepository.save(invoice);
        }

        public Optional<TableSession> findActiveSessionByTableId(Long tableId) {
                Objects.requireNonNull(tableId, "tableId must not be null");
                return sessionRepository.findByTableIdAndEndTimeIsNull(tableId);
        }

        public void deleteInvoice(Long invoiceId) {
                Objects.requireNonNull(invoiceId, "invoiceId must not be null");
                if (!invoiceRepository.existsById(invoiceId)) {
                        throw new IllegalArgumentException("Invoice not found");
                }
                invoiceRepository.deleteById(invoiceId);
        }

        public Invoice createInvoiceWithItemsAndDiscount(Long tableId, String customerName, 
                                                         java.util.List<?> itemsList, 
                                                         BigDecimal discountPercent, 
                                                         BigDecimal taxPercent) {
                Objects.requireNonNull(tableId, "tableId must not be null");
                Objects.requireNonNull(itemsList, "itemsList must not be null");
                
                BilliardTable table = tableRepository.findById(tableId)
                        .orElseThrow(() -> new IllegalArgumentException("Table not found"));
                
                // Create new invoice (no session link for now, user can link later)
                Invoice invoice = new Invoice();
                invoice.setCustomerName(customerName);
                invoice.setCreatedAt(LocalDateTime.now());
                
                // Add items
                BigDecimal subtotal = BigDecimal.ZERO;
                for (Object itemObj : itemsList) {
                        if (itemObj instanceof java.util.Map) {
                                java.util.Map<?, ?> itemMap = (java.util.Map<?, ?>) itemObj;
                                Long productId = Long.valueOf(itemMap.get("productId").toString());
                                int quantity = Integer.parseInt(itemMap.get("quantity").toString());
                                BigDecimal price = new BigDecimal(itemMap.get("price").toString());
                                
                                Product product = productRepository.findById(productId)
                                        .orElseThrow(() -> new IllegalArgumentException("Product " + productId + " not found"));
                                
                                InvoiceItem item = new InvoiceItem();
                                item.setProduct(product);
                                item.setQuantity(quantity);
                                item.setUnitPrice(price);
                                item.setLineTotal(price.multiply(BigDecimal.valueOf(quantity)));
                                
                                invoice.getItems().add(item);
                                subtotal = subtotal.add(item.getLineTotal());
                        }
                }
                
                invoice.setSubtotal(subtotal);
                invoice.setDiscountPercent(discountPercent);
                BigDecimal discountAmount = subtotal.multiply(discountPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                invoice.setDiscountAmount(discountAmount);
                
                BigDecimal afterDiscount = subtotal.subtract(discountAmount);
                invoice.setTaxPercent(taxPercent);
                BigDecimal taxAmount = afterDiscount.multiply(taxPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                invoice.setTaxAmount(taxAmount);
                
                BigDecimal total = afterDiscount.add(taxAmount);
                invoice.setTotal(total);
                
                return invoiceRepository.save(invoice);
        }
}
