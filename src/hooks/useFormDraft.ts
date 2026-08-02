import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../lib/api";

export function useFormDraft<T>(quarterType: string, financialYear: string, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Track previous data to avoid unnecessary saves
  const prevDataRef = useRef<T>(initialData);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const localKey = `layer1_draft_${quarterType}_${financialYear}`;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Try DB first
        const dbRes = await fetchWithAuth(`/api/v1/layer1/db/${quarterType}?financial_year=${financialYear}`);
        const dbData = await dbRes.json();

        // 2. Try sessionStorage draft
        let localData = null;
        try {
          const uId = sessionStorage.getItem("userId") || "admin-01";
          const localKey = `layer1_draft_${uId}_${quarterType}_${financialYear}`;
          const localStr = sessionStorage.getItem(localKey);
          if (localStr) {
            localData = JSON.parse(localStr);
          }
        } catch(e) {}
        
        let mergedData = {} as any;
        
        if (dbData.data && Object.keys(dbData.data).length > 0) {
          mergedData = { ...dbData.data };
        }
        
        // Deep merge could be better, but root-level override preserves unsubmitted work
        if (localData && Object.keys(localData).length > 0) {
          // If sidebar exists in both, merge sidebar keys
          if (mergedData.sidebar && localData.sidebar) {
            mergedData.sidebar = { ...mergedData.sidebar, ...localData.sidebar };
          } else if (localData.sidebar) {
            mergedData.sidebar = localData.sidebar;
          }
          
          // Merge quarters explicitly
          if (mergedData.quarters && localData.quarters) {
            mergedData.quarters = { ...mergedData.quarters, ...localData.quarters };
          } else if (localData.quarters) {
            mergedData.quarters = localData.quarters;
          }
          
          // Merge other roots if any
          for (const k of Object.keys(localData)) {
            if (k !== 'sidebar' && k !== 'quarters') {
              mergedData[k] = localData[k];
            }
          }
        }

        if (Object.keys(mergedData).length > 0) {
          setData(mergedData);
          prevDataRef.current = mergedData;
        }
      } catch (err) {
        console.error("Failed to load form data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [quarterType, financialYear, localKey]);

  const updateData = useCallback((newData: T) => {
    setData(newData);

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Only save if data actually changed
      if (JSON.stringify(newData) !== JSON.stringify(prevDataRef.current)) {
        setSaving(true);
        try {
          const uId = sessionStorage.getItem("userId") || "admin-01";
          const dynamicLocalKey = `layer1_draft_${uId}_${quarterType}_${financialYear}`;
          sessionStorage.setItem(dynamicLocalKey, JSON.stringify(newData));
          prevDataRef.current = newData;
        } catch (err) {
          console.error("Failed to save draft to sessionStorage", err);
        } finally {
          setSaving(false);
        }
      }
    }, 1000); // 1s debounce

  }, [localKey]);

  const submitStep = async (stepId: string, stepData: any) => {
    try {
      await fetchWithAuth(`/api/v1/layer1/submit/${stepId}/${quarterType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          financial_year: financialYear,
          data: stepData,
        }),
      });
      console.log(`Step ${stepId} successfully submitted to database.`);
    } catch (err) {
      console.error(`Failed to submit data for step ${stepId}`, err);
      throw err;
    }
  };

  const submitFinal = async (allData: any) => {
    try {
      if (!allData || !allData.quarters) return;
      
      const quarters = Object.keys(allData.quarters);
      for (const q of quarters) {
        const qData = allData.quarters[q];
        if (!qData) continue;
        
        const steps = Object.keys(qData);
        for (const stepId of steps) {
          try {
            await fetchWithAuth(`/api/v1/layer1/submit/${stepId}/${q}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ financial_year: financialYear, data: qData[stepId] }),
            });
            console.log(`Step ${stepId} for quarter ${q} submitted successfully.`);
          } catch (err) {
            console.error(`Failed to submit data for step ${stepId} in quarter ${q}`, err);
          }
        }
      }
    } catch(e) {
      console.error("Final submit failed", e);
      throw e;
    }
  };

  return { data, updateData, submitFinal, submitStep, loading, saving };
}
