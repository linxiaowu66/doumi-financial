import { Card, Statistic, Tooltip, Space, Row, Col } from 'antd';
import { FundOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { InvestmentDirection } from '@/types/investment-direction';

interface StatsCardProps {
  directions: InvestmentDirection[];
}

export default function StatsCard({ directions }: StatsCardProps) {
  // 计算总计
  const totalExpected = directions.reduce(
    (sum, d) => sum + Number(d.expectedAmount),
    0
  );
  const totalActual = directions.reduce(
    (sum, d) => sum + Number(d.actualAmount),
    0
  );

  return (
    <Row gutter={16} className="mb-6">
      <Col span={8}>
        <Card>
          <Statistic
            title="投资方向数量"
            value={directions.length}
            suffix="个"
            prefix={<FundOutlined />}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title={
              <Space>
                预期总投入
                <Tooltip title="所有投资方向的目标投入金额总和">
                  <QuestionCircleOutlined
                    style={{ color: '#1890ff', cursor: 'help' }}
                  />
                </Tooltip>
              </Space>
            }
            value={totalExpected}
            precision={2}
            prefix="¥"
            styles={{ content: { color: '#1890ff' } }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title={
              <Space>
                实际总投入
                <Tooltip title="所有投资方向的买入交易金额总和，不包括卖出和分红">
                  <QuestionCircleOutlined
                    style={{ color: '#1890ff', cursor: 'help' }}
                  />
                </Tooltip>
              </Space>
            }
            value={totalActual}
            precision={2}
            prefix="¥"
            styles={{ content: { color: '#52c41a' } }}
          />
        </Card>
      </Col>
    </Row>
  );
}
