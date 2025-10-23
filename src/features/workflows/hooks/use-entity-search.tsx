import { PAGINATION } from "@/config/constants";
import { useEffect, useState } from "react";

interface useEntitySearchProps<T extends { search: string; page: number }> {
    params: T;
    setParams: (params: T) => void;
    debouceMs?: number;
}

export function useEntitySearch<T extends {
    search: string;
    page: number;
}> ({
    params,
    setParams,
    debouceMs = 500
}: useEntitySearchProps<T>) {
    const [localSearch, setLocalSearch] = useState(params.search);

    useEffect(() => {
        if(localSearch === "" && params.search !== ""){
            setParams({
                ...params,
                search: "",
                page: PAGINATION.DEFAULT_PAGE,
            });
            return;
        }

        const timer = setTimeout(() => {
            if(localSearch !== params.search) {
                setParams({
                    ...params,
                    search: localSearch,
                    page: PAGINATION.DEFAULT_PAGE,
                })
            }
        }, debouceMs)

        return () => clearTimeout(timer);
    }, [localSearch, params, setParams, debouceMs]);

    useEffect(() => {
        setLocalSearch(params.search)
    }, [params.search]);

    return {
        searchValue: localSearch,
        onSearchChange: setLocalSearch,
    };
};