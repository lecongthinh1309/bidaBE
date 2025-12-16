import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import adminApi from "../api/adminAxios";

const ReserveTables = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [reserveForm, setReserveForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    reservationTime: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    durationHours: 1,
    notes: "",
  });

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get("/tables");
      const tableList = Array.isArray(res.data) ? res.data : res.data?.content || [];
      // Chỉ hiển thị bàn trống
      setTables(tableList.filter((t) => t.status === "AVAILABLE"));
    } catch (err) {
      setError("Lỗi tải danh sách bàn: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setReserveDialogOpen(true);
    setError("");
    setSuccess("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setReserveForm((prev) => ({
      ...prev,
      [name]: name === "durationHours" ? parseInt(value) : value,
    }));
  };

  const handleSubmitReservation = async () => {
    if (!reserveForm.customerName.trim() || !reserveForm.customerPhone.trim() || !reserveForm.customerEmail.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin khách hàng");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        table: { id: selectedTable.id },
        customerName: reserveForm.customerName.trim(),
        customerPhone: reserveForm.customerPhone.trim(),
        customerEmail: reserveForm.customerEmail.trim(),
        reservationTime: new Date(reserveForm.reservationTime).toISOString(),
        durationHours: reserveForm.durationHours,
        notes: reserveForm.notes.trim(),
        status: "PENDING",
      };

      const res = await adminApi.post("/reservations", payload);
      setSuccess("✅ Đặt bàn thành công! Mã đặt: " + res.data.id);
      setReserveDialogOpen(false);
      
      // Reset form
      setReserveForm({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        reservationTime: new Date().toISOString().slice(0, 16),
        durationHours: 1,
        notes: "",
      });
      
      await loadTables();
    } catch (err) {
      setError("❌ Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        🎱 Đặt Bàn Online
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading && !tables.length ? (
        <Typography>Đang tải...</Typography>
      ) : tables.length === 0 ? (
        <Alert severity="info">Hiện không có bàn trống. Vui lòng quay lại sau!</Alert>
      ) : (
        <Grid container spacing={2}>
          {tables.map((table) => (
            <Grid item xs={12} sm={6} md={4} key={table.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s, boxShadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {table.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {table.description}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Giá:</strong> {parseInt(table.pricePerHour).toLocaleString("vi-VN")}đ/giờ
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: "green", fontWeight: "bold" }}>
                    {table.status}
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleSelectTable(table)}
                  >
                    Đặt Bàn Này
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Reservation Dialog */}
      <Dialog open={reserveDialogOpen} onClose={() => setReserveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Đặt Bàn: {selectedTable?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Tên khách hàng"
              name="customerName"
              value={reserveForm.customerName}
              onChange={handleFormChange}
              fullWidth
              required
            />
            <TextField
              label="Số điện thoại"
              name="customerPhone"
              value={reserveForm.customerPhone}
              onChange={handleFormChange}
              fullWidth
              required
            />
            <TextField
              label="Email"
              name="customerEmail"
              type="email"
              value={reserveForm.customerEmail}
              onChange={handleFormChange}
              fullWidth
              required
            />
            <TextField
              label="Ngày & Giờ đặt"
              name="reservationTime"
              type="datetime-local"
              value={reserveForm.reservationTime}
              onChange={handleFormChange}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Số giờ muốn đặt"
              name="durationHours"
              type="number"
              value={reserveForm.durationHours}
              onChange={handleFormChange}
              fullWidth
              inputProps={{ min: 1, max: 8 }}
            />
            <TextField
              label="Ghi chú (tùy chọn)"
              name="notes"
              value={reserveForm.notes}
              onChange={handleFormChange}
              fullWidth
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReserveDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleSubmitReservation}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Xác Nhận Đặt Bàn"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReserveTables;
