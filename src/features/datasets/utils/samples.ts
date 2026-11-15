export interface Sample {
  name: string;
  label: string;
  file: () => globalThis.File;
  questions: string[];
}

export function getSampleQuestionsByDatasetName(name: string): string[] | undefined {
  return SAMPLES.find((sample) => sample.name === name)?.questions;
}

function createSampleCsv(name: string, content: string): globalThis.File {
  return new globalThis.File([content], name, { type: "text/csv" });
}

export const SAMPLES: Sample[] = [
  {
    name: "retail-performance.csv",
    label: "Retail Performance",
    file: () =>
      createSampleCsv(
        "retail-performance.csv",
        `month,region,category,revenue,units,profit,ad_spend,customer_score,return_rate
2024-01,North,Electronics,42000,310,8400,3200,86,3.1
2024-01,South,Furniture,28000,140,5200,2100,81,4.0
2024-01,East,Clothing,35000,620,9100,2600,88,2.6
2024-01,West,Electronics,38000,285,7600,3000,84,3.3
2024-02,North,Furniture,30000,155,5600,2300,83,3.8
2024-02,South,Clothing,39000,700,9800,2800,89,2.4
2024-02,East,Electronics,45000,330,9000,3400,85,3.0
2024-02,West,Furniture,32000,165,6000,2400,82,3.9
2024-03,North,Clothing,41000,760,10500,3000,90,2.2
2024-03,South,Electronics,46000,335,9200,3500,87,2.9
2024-03,East,Furniture,36000,180,6500,2500,84,3.6
2024-03,West,Clothing,43000,790,11000,3100,91,2.1
2024-04,North,Electronics,48000,345,9600,3600,86,2.8
2024-04,South,Furniture,34000,170,6200,2450,83,3.7
2024-04,East,Clothing,40000,730,10200,2900,89,2.3
2024-04,West,Electronics,50000,355,10000,3800,85,3.0
2024-05,North,Furniture,33000,160,5900,2350,84,3.5
2024-05,South,Clothing,42000,780,10800,3050,90,2.2
2024-05,East,Electronics,47000,340,9400,3550,86,2.9
2024-05,West,Furniture,35000,175,6400,2550,83,3.6
2024-06,North,Clothing,45000,820,11500,3200,91,2.0
2024-06,South,Electronics,52000,370,10400,3900,87,2.7
2024-06,East,Furniture,37000,185,6700,2600,85,3.4
2024-06,West,Clothing,46000,840,11800,3300,92,1.9`,
      ),
    questions: [
      "Show a line chart of total revenue by month.",
      "Show monthly revenue as an area chart to highlight the trend over time.",
      "Create a bar chart comparing total revenue by region.",
      "What percentage of total revenue comes from each category? Show as a pie chart.",
      "Show average customer_score by region in a radial chart.",
      "Compare regions on revenue, profit, and customer_score using a radar chart.",
      "Create a composed chart with monthly revenue as bars and profit as a line.",
      "Plot revenue and ad_spend by month on the same chart to compare trend and spend.",
      "Show revenue by month split by category as a grouped bar chart.",
      "Which region has the lowest average return_rate? Show it with a bar chart.",
    ],
  },
  {
    name: "employee-performance.csv",
    label: "Employee Performance",
    file: () =>
      createSampleCsv(
        "employee-performance.csv",
        `employee,department,team,month,sales,projects_completed,customer_rating,attendance_rate,training_hours
Ava Chen,Sales,Enterprise,2024-01,42000,3,4.6,98,6
Noah Patel,Sales,SMB,2024-01,31000,2,4.4,96,4
Mia Johnson,Engineering,Platform,2024-01,0,5,4.8,99,10
Liam Garcia,Engineering,Data,2024-01,0,4,4.7,97,8
Emma Davis,Support,Customer Care,2024-01,12000,6,4.5,95,5
Ava Chen,Sales,Enterprise,2024-02,45000,4,4.7,99,5
Noah Patel,Sales,SMB,2024-02,34000,3,4.5,97,6
Mia Johnson,Engineering,Platform,2024-02,0,6,4.9,100,9
Liam Garcia,Engineering,Data,2024-02,0,5,4.8,98,7
Emma Davis,Support,Customer Care,2024-02,14000,7,4.6,96,4
Ava Chen,Sales,Enterprise,2024-03,48000,4,4.8,98,7
Noah Patel,Sales,SMB,2024-03,36000,3,4.6,97,5
Mia Johnson,Engineering,Platform,2024-03,0,7,4.9,99,11
Liam Garcia,Engineering,Data,2024-03,0,5,4.8,98,8
Emma Davis,Support,Customer Care,2024-03,15000,8,4.7,97,6
Ava Chen,Sales,Enterprise,2024-04,51000,5,4.9,99,6
Noah Patel,Sales,SMB,2024-04,38000,4,4.7,98,5
Mia Johnson,Engineering,Platform,2024-04,0,6,4.9,100,10
Liam Garcia,Engineering,Data,2024-04,0,6,4.8,99,9
Emma Davis,Support,Customer Care,2024-04,16000,8,4.8,98,5`,
      ),
    questions: [
      "Show total projects_completed by department as a bar chart.",
      "Plot monthly sales for Ava Chen and Noah Patel as a multi-series line chart.",
      "Compare departments on average customer_rating, attendance_rate, and training_hours with a radar chart.",
      "Show the share of total training_hours by department as a pie chart.",
      "Create a composed chart showing total projects_completed by month as bars and average customer_rating as a line.",
      "Show average attendance_rate by department in a radial chart.",
      "Visualize total sales by month as an area chart.",
    ],
  },
  {
    name: "inventory-operations.csv",
    label: "Inventory Operations",
    file: () =>
      createSampleCsv(
        "inventory-operations.csv",
        `date,warehouse,category,sku,item_name,stock_on_hand,units_sold,units_received,unit_cost,unit_price
2024-04-01,North,Electronics,SKU-101,Wireless Mouse,150,42,60,12.5,29.99
2024-04-01,South,Electronics,SKU-102,Mechanical Keyboard,80,18,30,38.0,89.99
2024-04-01,East,Furniture,SKU-201,Office Chair,45,9,15,95.0,199.99
2024-04-01,West,Furniture,SKU-202,Standing Desk,30,6,10,220.0,449.99
2024-04-01,North,Accessories,SKU-301,USB-C Hub,120,35,40,14.0,39.99
2024-04-08,North,Electronics,SKU-101,Wireless Mouse,138,48,36,12.5,29.99
2024-04-08,South,Electronics,SKU-102,Mechanical Keyboard,86,20,26,38.0,89.99
2024-04-08,East,Furniture,SKU-201,Office Chair,43,11,9,95.0,199.99
2024-04-08,West,Furniture,SKU-202,Standing Desk,28,8,6,220.0,449.99
2024-04-08,North,Accessories,SKU-301,USB-C Hub,110,39,29,14.0,39.99
2024-04-15,North,Electronics,SKU-101,Wireless Mouse,126,52,40,12.5,29.99
2024-04-15,South,Electronics,SKU-102,Mechanical Keyboard,84,22,20,38.0,89.99
2024-04-15,East,Furniture,SKU-201,Office Chair,40,12,9,95.0,199.99
2024-04-15,West,Furniture,SKU-202,Standing Desk,26,7,5,220.0,449.99
2024-04-15,North,Accessories,SKU-301,USB-C Hub,102,41,33,14.0,39.99
2024-04-22,North,Electronics,SKU-101,Wireless Mouse,118,55,47,12.5,29.99
2024-04-22,South,Electronics,SKU-102,Mechanical Keyboard,81,24,21,38.0,89.99
2024-04-22,East,Furniture,SKU-201,Office Chair,39,10,9,95.0,199.99
2024-04-22,West,Furniture,SKU-202,Standing Desk,25,6,5,220.0,449.99
2024-04-22,North,Accessories,SKU-301,USB-C Hub,95,44,37,14.0,39.99`,
      ),
    questions: [
      "Show total units_sold by date as a line chart.",
      "Compare units_sold and units_received by date with a composed chart.",
      "Show total stock_on_hand by warehouse as a bar chart.",
      "What share of total units_sold comes from each category? Display as a pie chart.",
      "Plot stock_on_hand trends for each category over time using an area chart.",
      "Compare warehouses on units_sold, units_received, and stock_on_hand using a radar chart.",
      "Show average unit_price by category in a radial chart.",
    ],
  },
];