import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Flex,
  Row,
  Col,
} from "antd";
import { FormInstance } from "antd/es/form";
import { Fund } from "@/types/investment-direction-detail";

const { TextArea } = Input;

interface FundModalProps {
  open: boolean;
  editingFund: Fund | null;
  categoryOptions: { label: string; value: string }[];
  categorySearchValue: string;
  onCancel: () => void;
  onFinish: (values: any) => void;
  onSearchCategory: (value: string) => void;
  onCategorySelect: (value: string) => void;
  onCategoryClear: () => void;
  form: FormInstance;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
}

export default function FundModal({
  open,
  editingFund,
  categoryOptions,
  categorySearchValue,
  onCancel,
  onFinish,
  onSearchCategory,
  onCategorySelect,
  onCategoryClear,
  form,
  onKeyDown,
  onBlur,
}: FundModalProps) {
  return (
    <Modal
      title={editingFund ? "编辑基金" : "新建基金"}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 24 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="基金代码"
              name="code"
              rules={[{ required: true, message: "请输入基金代码" }]}
            >
              <Input placeholder="如：000001" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="分类标识"
              name="category"
              tooltip="用于分组展示，如：标普、纳指、沪深300等"
            >
              <Select
                placeholder="选择或输入分类"
                size="large"
                showSearch
                allowClear
                options={categoryOptions}
                onSearch={onSearchCategory}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                filterOption={(input, option) => {
                  if (!option?.value) return false;
                  return (option.value as string)
                    .toLowerCase()
                    .includes(input.toLowerCase());
                }}
                notFoundContent={
                  categorySearchValue ? (
                    <div style={{ padding: "8px 0", textAlign: "center" }}>
                      <span style={{ color: "#999", fontSize: 12 }}>
                        按回车创建新分类 &quot;{categorySearchValue}&quot;
                      </span>
                    </div>
                  ) : null
                }
                onSelect={onCategorySelect}
                onClear={onCategoryClear}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="确认天数"
              name="confirmDays"
              initialValue={1}
              tooltip="交易确认所需工作日"
            >
              <Select size="large">
                <Select.Option value={1}>T+1 (境内)</Select.Option>
                <Select.Option value={2}>T+2 (QDII)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="买入费率 (%)"
              name="defaultBuyFee"
              initialValue={0.15}
              tooltip="预估买入费率"
            >
              <InputNumber<number>
                min={0}
                max={100}
                precision={2}
                step={0.01}
                addonAfter="%"
                style={{ width: "100%" }}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="卖出费率 (%)"
              name="defaultSellFee"
              initialValue={0.50}
              tooltip="预估卖出费率"
            >
              <InputNumber<number>
                min={0}
                max={100}
                precision={2}
                step={0.01}
                addonAfter="%"
                style={{ width: "100%" }}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="基金名称"
          name="name"
          rules={[{ required: true, message: "请输入基金名称" }]}
        >
          <Input placeholder="如：华夏上证50ETF" size="large" />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
          tooltip="记录限购、换购等特殊情况"
        >
          <TextArea
            placeholder="如：该基金QDII限购，改买XXX基金"
            rows={3}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Flex justify="flex-end" gap="small">
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingFund ? "更新" : "创建"}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
}
