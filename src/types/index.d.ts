interface IntentDetectionResponse {
  type: "expense" | "query" | "income" | "registration" | "other";
}

interface ExpenseAnalysisResponse {
  success: boolean;
  data?: {
    amount: number;
    payment_method: string;
    macro_category: string;
    detailed_category: string;
    date: string;
    type: "income" | "expense";
  };
  message?: string;
}

interface QueryAnalysisResponse {
  success: boolean;
  data?: {
    start_date: string;
    end_date: string;
  };
  message?: string;
}
