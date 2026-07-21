import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../lib/api";

export function useFormDraft<T>(quarterType: string, financialYear: string, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Track previous data to avoid unnecessary saves
  const prevDataRef = useRef<T>(initialData);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Try DB first
        const dbRes = await fetchWithAuth(`/api/v1/layer1/db/${quarterType}?financial_year=${financialYear}`);
        const dbData = await dbRes.json();

        if (dbData.data) {
          setData(dbData.data);
          prevDataRef.current = dbData.data;
          setLoading(false);
          return;
        }

        // 2. Try Redis draft
        const draftRes = await fetchWithAuth(`/api/v1/layer1/draft/${quarterType}?financial_year=${financialYear}`);
        const draftData = await draftRes.json();
        
        if (draftData.data && Object.keys(draftData.data).length > 0) {
          setData(draftData.data);
          prevDataRef.current = draftData.data;
        }
      } catch (err) {
        console.error("Failed to load form data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [quarterType, financialYear]);

  const updateData = useCallback((newData: T) => {
    setData(newData);

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Only save if data actually changed
      if (JSON.stringify(newData) !== JSON.stringify(prevDataRef.current)) {
        setSaving(true);
        try {
          await fetchWithAuth(`/api/v1/layer1/draft/${quarterType}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              financial_year: financialYear,
              data: newData,
            }),
          });
          prevDataRef.current = newData;
        } catch (err) {
          console.error("Failed to save draft", err);
        } finally {
          setSaving(false);
        }
      }
    }, 1000); // 1s debounce

  }, [quarterType, financialYear]);

  const submitFinal = async () => {
    try {
      await fetchWithAuth(`/api/v1/layer1/submit/${quarterType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          financial_year: financialYear,
          data,
        }),
      });
      // Redis is cleared on backend. 
    } catch (err) {
      console.error("Failed to submit final data", err);
      throw err;
    }
  };

  return { data, updateData, submitFinal, loading, saving };
}
