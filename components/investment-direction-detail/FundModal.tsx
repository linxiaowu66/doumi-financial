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
  directionType?: "FUND" | "STOCK";
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
  directionType = "FUND",
}: FundModalProps) {
  const isStock = directionType === "STOCK";

  return (
    <Modal
      title={
        editingFund
          ? isStock
            ? "编辑股票"
            : "编辑基金"
          : isStock
            ? "新建股票"
            : "新建基金"
      }
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
              label={isStock ? "股票代码" : "基金代码"}
              name="code"
              rules={[
                {
                  required: true,
                  message: `请输入${isStock ? "股票" : "基金"}代码`,
                },
              ]}
            >
              <Input
                placeholder={
                  isStock
                    ? "如：sh600519 或 sz000001"
                    : "如：000001 或 sh600519"
                }
                size="large"
              />
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
              initialValue={isStock ? 0 : 1}
              tooltip={
                isStock ? "股票通常成交即确认，设为0" : "交易确认所需工作日"
              }
            >
              <Select size="large">
                {isStock && <Select.Option value={0}>T+0 (即时)</Select.Option>}
                <Select.Option value={1}>T+1 (境内)</Select.Option>
                <Select.Option value={2}>T+2 (QDII)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="买入费率 (%)"
              name="defaultBuyFee"
              initialValue={isStock ? 0 : 0.15}
              tooltip={isStock ? "股票交易将使用系统费率设置" : "预估买入费率"}
            >
              <InputNumber<number>
                min={0}
                max={100}
                precision={4}
                step={0.01}
                addonAfter="%"
                style={{ width: "100%" }}
                size="large"
                disabled={isStock}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="卖出费率 (%)"
              name="defaultSellFee"
              initialValue={isStock ? 0 : 0.5}
              tooltip={isStock ? "股票交易将使用系统费率设置" : "预估卖出费率"}
            >
              <InputNumber<number>
                min={0}
                max={100}
                precision={4}
                step={0.01}
                addonAfter="%"
                style={{ width: "100%" }}
                size="large"
                disabled={isStock}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={isStock ? "股票名称" : "基金名称"}
          name="name"
          rules={[
            {
              required: true,
              message: `请输入${isStock ? "股票" : "基金"}名称`,
            },
          ]}
        >
          <Input
            placeholder={
              isStock
                ? "如：贵州茅台 或 腾讯控股"
                : "如：华夏上证50ETF 或 贵州茅台"
            }
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
          tooltip={
            isStock ? "记录投资理由、持仓策略等" : "记录限购、换购等特殊情况"
          }
        >
          <TextArea
            placeholder={
              isStock
                ? "如：该股属于XX板块，长期持有"
                : "如：该基金QDII限购，改买XXX基金"
            }
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
