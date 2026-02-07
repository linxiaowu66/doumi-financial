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
}: TransactionModalProps) {
  return (
    <Modal
      title={
        transactionType === "BUY"
          ? "买入"
          : transactionType === "SELL"
          ? "卖出"
          : "分红"
      }
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

        {transactionType !== "DIVIDEND" && (
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
                  label="买入金额"
                  name="amount"
                  rules={[{ required: true, message: "请输入买入金额" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    placeholder="输入金额"
                    prefix="¥"
                  />
                </Form.Item>
              </Col>
              {!isPending && (
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
              )}
            </Row>
            {!isPending && (
              <Form.Item
                label="买入净值"
                name="price"
                rules={[{ required: true, message: "请输入买入净值" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={4}
                  placeholder="输入净值"
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
                  label="卖出份额"
                  name="shares"
                  rules={[{ required: true, message: "请输入卖出份额" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    placeholder="输入份额"
                  />
                </Form.Item>
              </Col>
              {!isPending && (
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
              )}
            </Row>
            {!isPending && (
              <Form.Item
                label="卖出净值"
                name="price"
                rules={[{ required: true, message: "请输入卖出净值" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={4}
                  placeholder="输入净值"
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
                  label="再投资份数"
                  name="dividendShares"
                  rules={[{ required: true, message: "请输入再投资份数" }]}
                  tooltip="从支付宝等平台查看分红后增加的份数"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    placeholder="输入再投资的份数"
                  />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="当日净值"
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
                      tooltip="根据份数和净值自动计算"
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
