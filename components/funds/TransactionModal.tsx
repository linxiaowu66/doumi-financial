import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Radio,
  Checkbox,
  Tooltip,
  Row,
  Col,
  Flex,
  Button,
} from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { FormInstance } from "antd/es/form";
import { useEffect } from "react";
import { getInvestmentConfig } from "@/lib/investment-type-config";
import { getCalculator } from "@/lib/fee-calculator";

const { TextArea } = Input;

interface TransactionModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
  transactionType: string;
  form: FormInstance;
  isPending: boolean;
  afterThreePM: boolean;
  dividendReinvest: boolean;
  fetchingHistoryPrice: boolean;
  isMobile: boolean;
  isEditing?: boolean;
  fund?: any;
  systemSettings?: Record<string, string>;
}

export default function TransactionModal({
  open,
  onCancel,
  onFinish,
  transactionType,
  form,
  isPending,
  dividendReinvest,
  fetchingHistoryPrice,
  isMobile,
  isEditing,
  fund,
  systemSettings,
}: TransactionModalProps) {
  const amountValue = Form.useWatch('amount', form);
  const sharesValue = Form.useWatch('shares', form);
  const priceValue = Form.useWatch('price', form);
  const feeValue = Form.useWatch('fee', form);

  const config = getInvestmentConfig(fund?.direction?.type);
  const isStock = config.type === 'STOCK';

  useEffect(() => {
    if (isEditing || !fund) return;
    
    const calculator = getCalculator(config.type);
    const result = calculator.calculate({
      type: transactionType as any,
      amount: Number(amountValue),
      shares: Number(sharesValue),
      price: Number(priceValue),
      code: fund.code,
      config: isStock ? systemSettings : { defaultBuyFee: fund.defaultBuyFee, defaultSellFee: fund.defaultSellFee }
    });

    if (result.fee !== undefined && result.fee !== feeValue) {
      form.setFieldValue('fee', result.fee);
    }
    
    if (isStock) {
      if (result.amount !== undefined && result.amount !== amountValue) {
        form.setFieldValue('amount', result.amount);
      }
    }
  }, [amountValue, sharesValue, priceValue, transactionType, fund, systemSettings, isEditing, form, config.type, isStock]);

  const getTitle = () => {
    if (isEditing) return "编辑交易";
    if (transactionType === 'DIVIDEND') return '分红';
    return transactionType === 'BUY' ? config.buyLabel : config.sellLabel;
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={isMobile ? "90%" : 600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 24 }}
      >
        <Form.Item name="type" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          label="交易日期"
          name="date"
          rules={[{ required: true, message: "请选择交易日期" }]}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            placeholder="选择日期"
          />
        </Form.Item>

        {transactionType !== "DIVIDEND" && !isEditing && config.allowPending && (
          <Form.Item style={{ marginBottom: 12 }}>
            <Flex gap="small">
              <Form.Item name="isPending" valuePropName="checked" noStyle>
                <Checkbox>
                  <Tooltip title="勾选后只需输入金额/份额，系统会在确认日自动匹配净值转为正式交易">
                    待确认交易 (等待净值) <ClockCircleOutlined />
                  </Tooltip>
                </Checkbox>
              </Form.Item>
              {isPending && (
                <Form.Item name="afterThreePM" valuePropName="checked" noStyle>
                  <Checkbox>
                    <Tooltip title="如果是在交易日15:00之后的操作，请勾选此项，系统会自动顺延到下一个交易日处理">
                      15:00后交易 <ClockCircleOutlined />
                    </Tooltip>
                  </Checkbox>
                </Form.Item>
              )}
            </Flex>
          </Form.Item>
        )}

        {transactionType === "BUY" && (
          <>
            <Row gutter={16}>
              <Col span={isPending ? 24 : 12}>
                <Form.Item
                  label={isStock ? `买入${config.unit}数` : "买入金额"}
                  name={isStock ? "shares" : "amount"}
                  rules={[{ required: true, message: `请输入买入${isStock ? config.unit + '数' : '金额'}` }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={isStock ? 0 : 2}
                    placeholder={`输入${isStock ? config.unit + '数' : '金额'}`}
                    prefix={isStock ? "" : "¥"}
                  />
                </Form.Item>
              </Col>
              {isStock ? (
                <Col span={12}>
                  <Form.Item
                    label={`买入${config.priceLabel}`}
                    name="price"
                    rules={[{ required: true, message: `请输入买入${config.priceLabel}` }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={4}
                      placeholder={`输入${config.priceLabel}`}
                    />
                  </Form.Item>
                </Col>
              ) : (
                !isPending && (
                  <Col span={12}>
                    <Form.Item
                      label="手续费"
                      name="fee"
                      tooltip="手续费将从买入金额中扣除"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="输入手续费"
                        prefix="¥"
                      />
                    </Form.Item>
                  </Col>
                )
              )}
            </Row>
            {isStock && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="买入金额"
                    name="amount"
                    tooltip="包含手续费的总支出"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      disabled
                      prefix="¥"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="手续费"
                    name="fee"
                    tooltip="包含佣金、过户费等"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      prefix="¥"
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
            {!isPending && !isStock && (
              <Form.Item
                label={`买入${config.priceLabel}`}
                name="price"
                rules={[{ required: true, message: `请输入买入${config.priceLabel}` }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={4}
                  placeholder={`输入${config.priceLabel}`}
                />
              </Form.Item>
            )}
          </>
        )}

        {transactionType === "SELL" && (
          <>
            <Row gutter={16}>
              <Col span={isPending ? 24 : 12}>
                <Form.Item
                  label={`卖出${isStock ? config.unit + '数' : config.unit}`}
                  name="shares"
                  rules={[{ required: true, message: `请输入卖出${isStock ? config.unit + '数' : config.unit}` }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={isStock ? 0 : 2}
                    placeholder={`输入${isStock ? config.unit + '数' : config.unit}`}
                  />
                </Form.Item>
              </Col>
              {isStock ? (
                <Col span={12}>
                  <Form.Item
                    label={`卖出${config.priceLabel}`}
                    name="price"
                    rules={[{ required: true, message: `请输入卖出${config.priceLabel}` }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={4}
                      placeholder={`输入${config.priceLabel}`}
                    />
                  </Form.Item>
                </Col>
              ) : (
                !isPending && (
                  <Col span={12}>
                    <Form.Item
                      label="手续费"
                      name="fee"
                      tooltip="手续费将从卖出金额中扣除"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="输入手续费"
                        prefix="¥"
                      />
                    </Form.Item>
                  </Col>
                )
              )}
            </Row>
            {isStock && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="卖出金额"
                    name="amount"
                    tooltip="扣除手续费后的净收入"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      disabled
                      prefix="¥"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="手续费"
                    name="fee"
                    tooltip="包含佣金、过户费、印花税等"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      prefix="¥"
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
            {!isPending && !isStock && (
              <Form.Item
                label={`卖出${config.priceLabel}`}
                name="price"
                rules={[{ required: true, message: `请输入卖出${config.priceLabel}` }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={4}
                  placeholder={`输入${config.priceLabel}`}
                />
              </Form.Item>
            )}
          </>
        )}

        {transactionType === "DIVIDEND" && (
          <>
            <Form.Item
              label="分红类型"
              name="dividendReinvest"
              rules={[{ required: true, message: "请选择分红类型" }]}
            >
              <Radio.Group
                onChange={(e) => {
                  if (e.target.value === false) {
                    form.setFieldValue("price", undefined);
                    form.setFieldValue("dividendShares", undefined);
                  } else {
                    form.setFieldValue("amount", undefined);
                  }
                }}
              >
                <Radio value={false}>现金分红</Radio>
                <Radio value={true}>分红再投资</Radio>
              </Radio.Group>
            </Form.Item>

            {dividendReinvest ? (
              <>
                <Form.Item
                  label={`再投资${isStock ? config.unit + '数' : config.unit}`}
                  name="dividendShares"
                  rules={[{ required: true, message: `请输入再投资${isStock ? config.unit + '数' : config.unit}` }]}
                  tooltip={isStock ? `分红后增加的${config.unit}数` : `从支付宝等平台查看分红后增加的${config.unit}`}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    placeholder={`输入再投资的${isStock ? config.unit + '数' : config.unit}`}
                  />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label={`当日${config.priceLabel}`}
                      name="price"
                      tooltip="系统会根据日期自动获取，也可手动修改"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={4}
                        placeholder="自动获取"
                        disabled={fetchingHistoryPrice}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="分红金额"
                      name="amount"
                      tooltip={`根据${isStock ? config.unit + '数和' + config.priceLabel : config.unit + '和' + config.priceLabel}自动计算`}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="自动计算"
                        prefix="¥"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ) : (
              <Form.Item
                label="分红金额"
                name="amount"
                rules={[{ required: true, message: "请输入分红金额" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="输入金额"
                  prefix="¥"
                />
              </Form.Item>
            )}
          </>
        )}

        <Form.Item label="备注" name="remark">
          <TextArea rows={2} placeholder="输入备注（可选）" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Flex justify="flex-end" gap="small">
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              确定
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
}
