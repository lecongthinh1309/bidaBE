import React, { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
} from "@mui/material";
import api from "../api/axios";

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tables"); // -> /api/tables
      const tablesData = res.data || [];

      // For occupied tables, fetch active session to show start time / total
      const withSessions = await Promise.all(
        tablesData.map(async (t) => {
          if (t.status === "OCCUPIED") {
            try {
              const s = await api.get(`/invoices/sessions/${t.id}`);
              return { ...t, currentSession: s.data };
            } catch (err) {
              return { ...t, currentSession: null };
            }
          }
          return { ...t, currentSession: null };
        })
      );

      setTables(withSessions);
    } catch (err) {
      console.error("Failed to load tables:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Bắt đầu tính giờ (tạo TableSession + đổi status sang OCCUPIED)
  const handleStart = async (id) => {
    try {
      await api.post(`/invoices/sessions/${id}/start`); // -> /api/invoices/sessions/{tableId}/start
      await load();
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  };

  // Kết thúc tính giờ (đóng session + đổi status sang AVAILABLE)
  const handleStop = async (id) => {
    try {
      const table = tables.find(t => t.id === id);
      if (!table || !table.currentSession) {
        console.error("Session not found");
        return;
      }

      const response = await api.post(`/invoices/sessions/${id}/end`); // -> /api/invoices/sessions/{tableId}/end
      const session = response.data;

      if (session && session.startTime && session.endTime) {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const durationMs = endTime - startTime;
        const durationMinutes = Math.floor(durationMs / 60000);
        const durationHours = Math.floor(durationMinutes / 60);
        const remainingMinutes = durationMinutes % 60;
        
        const totalCost = session.total != null ? session.total.toLocaleString() : "0";
        const timeStr = durationHours > 0 
          ? `${durationHours}h ${remainingMinutes}m` 
          : `${durationMinutes}m`;
        
        alert(`Thời gian chơi: ${timeStr}\nTổng tiền: ${totalCost} đ`);
      }

      // Reload data after ending session
      setTimeout(() => load(), 500);
    } catch (err) {
      console.error("Failed to end session:", err);
      alert("Kết thúc ca không thành công");
    }
  };

  // Sửa nhanh: dùng window.prompt để đổi tên & giá, gọi PUT /tables/{id}
  const handleEdit = async (table) => {
    const name = window.prompt("Tên bàn:", table.name);
    if (name === null) return;

    const desc = window.prompt("Mô tả (tùy chọn):", table.description || "");
    if (desc === null) return;

    const priceStr = window.prompt("Giá / giờ:", table.pricePerHour);
    if (priceStr === null) return;

    const price = Number(priceStr);
    if (Number.isNaN(price)) {
      alert("Giá không hợp lệ");
      return;
    }

    try {
      await api.put(`/tables/${table.id}`, {
        name,
        pricePerHour: price,
        status: table.status, // giữ nguyên status
        description: desc,
      });
      await load();
    } catch (err) {
      console.error("Failed to update table:", err);
    }
  };

  // Thêm bàn mới
  const handleCreate = async () => {
    const name = window.prompt("Tên bàn mới:");
    if (!name) return;

    const priceStr = window.prompt("Giá / giờ:");
    if (!priceStr) return;

    const desc = window.prompt("Mô tả (tùy chọn):", "");

    const price = Number(priceStr);
    if (Number.isNaN(price)) {
      alert("Giá không hợp lệ");
      return;
    }

    try {
      await api.post("/tables", {
        name,
        pricePerHour: price,
        description: desc,
        status: "AVAILABLE",
      });
      await load();
    } catch (err) {
      console.error("Failed to create table:", err);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h6">Quản Lý Bàn Bi-a</Typography>
        <Button variant="contained" onClick={handleCreate}>
          Thêm bàn
        </Button>
      </Stack>

      {loading ? (
        <Typography>Đang tải danh sách bàn...</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã</TableCell>
              <TableCell>Mô tả</TableCell>
              <TableCell>Giờ đặt</TableCell>
              <TableCell>Tên bàn</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Giá/giờ</TableCell>
              <TableCell>Giờ bắt đầu</TableCell>
              <TableCell>Giờ kết thúc</TableCell>
              <TableCell>Thành tiền</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {tables.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.id}</TableCell>
                <TableCell>{t.description || '-'}</TableCell>
                <TableCell>{t.reservationTime ? new Date(t.reservationTime).toLocaleString() : '-'}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell>
                  {typeof t.pricePerHour === "number"
                    ? t.pricePerHour.toLocaleString()
                    : t.pricePerHour}
                  {" đ"}
                </TableCell>
                <TableCell>
                  {t.currentSession && t.currentSession.startTime
                    ? new Date(t.currentSession.startTime).toLocaleString()
                    : "-"}
                </TableCell>
                <TableCell>
                  {t.currentSession && t.currentSession.endTime
                    ? new Date(t.currentSession.endTime).toLocaleString()
                    : "-"}
                </TableCell>
                <TableCell>
                  {t.currentSession && t.currentSession.total != null
                    ? (typeof t.currentSession.total === 'number'
                        ? t.currentSession.total.toLocaleString() + ' đ'
                        : t.currentSession.total + ' đ')
                    : "-"}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {(t.status === "AVAILABLE" || t.status === "RESERVED") ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleStart(t.id)}
                      >
                        Bắt đầu
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={() => handleStop(t.id)}
                      >
                        Kết thúc
                      </Button>
                    )}
                    {t.currentSession && t.currentSession.endTime && (
                      <Button size="small" variant="outlined" onClick={async ()=>{
                        // create invoice from session
                        try{
                          await api.post(`/invoices/sessions/${t.currentSession.id}/create-invoice`)
                          alert('Hoá đơn đã được tạo')
                          await load()
                        }catch(e){
                          console.error(e)
                          alert('Tạo hoá đơn thất bại')
                        }
                      }}>Tạo hoá đơn</Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleEdit(t)}
                    >
                      Sửa
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
