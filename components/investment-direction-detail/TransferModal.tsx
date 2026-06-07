"use client";

import { useEffect, useState } from "react";
import { Modal, Select, Form, message } from "antd";
import { Fund, InvestmentDirection } from "@/types/investment-direction-detail";

interface TransferModalProps {
  open: boolean;
  fund: Fund | null;
  currentDirectionId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function TransferModal({
  open,
  fund,
  currentDirectionId,
  onCancel,
  onSuccess,
}: TransferModalProps) {
  const [form] = Form.useForm();
  const [directions, setDirections] = useState<InvestmentDirection[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categorySearchValue, setCategorySearchValue] = useState("");

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setCategoryOptions([]);
    setCategorySearchValue("");
    setLoading(true);
    fetch("/api/investment-directions")
      .then((r) => r.json())
      .then((data: InvestmentDirection[]) => {
        setDirections(data.filter((d) => d.id !== currentDirectionId));
      })
      .catch(() => message.error("加载投资方向失败"))
      .finally(() => setLoading(false));
  }, [open, currentDirectionId, form]);

  const handleDirectionChange = async (directionId: number) => {
    form.setFieldValue("category", undefined);
    setCategoryOptions([]);
    setCategoryLoading(true);
    try {
      const res = await fetch(`/api/funds?directionId=${directionId}`);
      const funds: Fund[] = await res.json();
      const cats = Array.from(
        new Set(funds.map((f) => f.category).filter((c): c is string => !!c && c.trim() !== "")),
      ).sort();
      setCategoryOptions(cats.map((c) => ({ label: c, value: c })));
    } catch {
      message.error("加载分类失败");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && categorySearchValue.trim()) {
      const trimmed = categorySearchValue.trim();
      if (!categoryOptions.some((o) => o.value === trimmed)) {
        setCategoryOptions((prev) => [...prev, { label: trimmed, value: trimmed }].sort((a, b) => a.value.localeCompare(b.value)));
      }
      form.setFieldValue("category", trimmed);
      setCategorySearchValue("");
      e.preventDefault();
    }
  };

  const handleCategoryBlur = () => {
    if (categorySearchValue.trim()) {
      const trimmed = categorySearchValue.trim();
      if (!categoryOptions.some((o) => o.value === trimmed)) {
        setCategoryOptions((prev) => [...prev, { label: trimmed, value: trimmed }].sort((a, b) => a.value.localeCompare(b.value)));
      }
      form.setFieldValue("category", trimmed);
      setCategorySearchValue("");
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    if (!fund) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/funds/${fund.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directionId: values.directionId,
          category: values.category ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success("转移成功");
      onSuccess();
    } catch {
      message.error("转移失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCategoryOptions([]);
    setCategorySearchValue("");
    onCancel();
  };

  return (
    <Modal
      title={`转移基金：${fund?.name || ""}`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确认转移"
      cancelText="取消"
      confirmLoading={submitting}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="directionId"
          label="目标投资方向"
          rules={[{ required: true, message: "请选择目标投资方向" }]}
        >
          <Select
            placeholder="请选择投资方向"
            loading={loading}
            options={directions.map((d) => ({ label: d.name, value: d.id }))}
            onChange={handleDirectionChange}
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="分类标识"
          tooltip="用于在目标方向中分组展示，如：固收、标普、纳指等"
        >
          <Select
            placeholder="选择或输入分类"
            showSearch
            allowClear
            loading={categoryLoading}
            options={categoryOptions}
            onSearch={setCategorySearchValue}
            onKeyDown={handleCategoryKeyDown}
            onBlur={handleCategoryBlur}
            onSelect={() => setCategorySearchValue("")}
            onClear={() => setCategorySearchValue("")}
            filterOption={(input, option) =>
              option ? (option.value as string).toLowerCase().includes(input.toLowerCase()) : false
            }
            notFoundContent={
              categorySearchValue ? (
                <div style={{ padding: "8px 0", textAlign: "center", color: "#999", fontSize: 12 }}>
                  按回车创建新分类 &quot;{categorySearchValue}&quot;
                </div>
              ) : null
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
