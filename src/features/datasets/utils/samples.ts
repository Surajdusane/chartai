export interface Sample {
  name: string;
  label: string;
  file: () => globalThis.File;
}

function createSampleCsv(name: string, content: string): globalThis.File {
  return new globalThis.File([content], name, { type: "text/csv" });
}

export const SAMPLES: Sample[] = [
  {
    name: "sales-data.csv",
    label: "Sales Data",
    file: () =>
      createSampleCsv("sales-data.csv", `date,product,region,sales,profit
2024-01-01,Widget A,North,1000,200
2024-01-02,Widget B,South,1500,300
2024-01-03,Widget A,East,800,160
2024-01-04,Widget C,West,2000,400
2024-01-05,Widget B,North,1200,240`),
  },
  {
    name: "employee-data.csv",
    label: "Employee Data",
    file: () =>
      createSampleCsv("employee-data.csv", `name,department,salary,start_date,performance
John Smith,Engineering,95000,2022-03-15,4.5
Jane Doe,Marketing,78000,2021-07-22,4.2
Bob Johnson,Sales,82000,2023-01-10,3.8
Alice Brown,Engineering,102000,2020-11-05,4.7
Charlie Wilson,HR,65000,2022-09-18,4.0`),
  },
  {
    name: "inventory.csv",
    label: "Inventory",
    file: () =>
      createSampleCsv("inventory.csv", `sku,product_name,category,stock_quantity,unit_price,reorder_level
SKU001,Wireless Mouse,Electronics,150,29.99,20
SKU002,Mechanical Keyboard,Electronics,80,89.99,15
SKU003,Office Chair,Furniture,45,199.99,10
SKU004,Standing Desk,Furniture,30,449.99,5
SKU005,Monitor 27",Electronics,60,279.99,10`),
  },
];