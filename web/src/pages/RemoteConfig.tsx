import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useLocation } from "react-router-dom";
import { RemoteConfigService } from "../services/remoteConfig";
import { Settings, Save } from "lucide-react";
import { toast } from "react-toastify";

interface RemoteConfigParameter {
    key: string;
    value: string | boolean | number;
    type: "string" | "boolean" | "number";
    description?: string;
}

export function RemoteConfig() {
    const [publishedParameters, setPublishedParameters] = useState<
        RemoteConfigParameter[]
    >([]);
    const [draftParameters, setDraftParameters] = useState<
        RemoteConfigParameter[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);

    const location = useLocation();

    const paramsEqual = (
        a: RemoteConfigParameter[],
        b: RemoteConfigParameter[]
    ) => {
        if (a.length !== b.length) return false;
        const ma = new Map(a.map((p) => [p.key, { t: p.type, v: p.value }]));
        const mb = new Map(b.map((p) => [p.key, { t: p.type, v: p.value }]));
        if (ma.size !== mb.size) return false;
        for (const [k, ov] of ma.entries()) {
            const bv = mb.get(k);
            if (!bv) return false;
            if (ov.t !== bv.t) return false;
            if (ov.v !== bv.v) return false;
        }
        return true;
    };

    const hasChanges = !paramsEqual(publishedParameters, draftParameters);

    const defaultReportsParam: RemoteConfigParameter = {
        key: "disable_reports_page",
        value: false,
        type: "boolean",
        description: "Controls access to the Reports page and analytics",
    };

    useEffect(() => {
        loadParameters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const loadParameters = async () => {
        try {
            setLoading(true);
            const params = await RemoteConfigService.getAllParameters();

            const map = new Map<string, RemoteConfigParameter>();
            for (const p of params) {
                const canonical =
                    p.key === "disable_reports" ? "disable_reports_page" : p.key;
                if (!map.has(canonical) || p.key === "disable_reports_page") {
                    map.set(canonical, { ...p, key: canonical });
                }
            }
            const normalized = Array.from(map.values());

            const hasReports = normalized.some(
                (p) => p.key === "disable_reports_page"
            );
            if (!hasReports) {
                normalized.push(defaultReportsParam);
            }

            setPublishedParameters(normalized);
            setDraftParameters([...normalized]);
        } catch (error) {
            console.error("Error loading Remote Config parameters:", error);
            toast.error("Failed to load Remote Config parameters");
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (
        key: string,
        newValue: string | boolean | number
    ) => {
        setDraftParameters((prev) =>
            prev.map((param) =>
                param.key === key ? { ...param, value: newValue } : param
            )
        );
    };

    const handlePublish = async () => {
        try {
            setPublishing(true);

            const payload: RemoteConfigParameter[] = draftParameters.flatMap((p) => {
                if (p.key === "disable_reports_page") {
                    return [p, { ...p, key: "disable_reports" }];
                }
                return [p];
            });

            await RemoteConfigService.publishConfig(payload);
            setPublishedParameters([...draftParameters]);
            toast.success("Remote Config published successfully!");
        } catch (error) {
            console.error("Error publishing Remote Config:", error);
            toast.error("Failed to publish Remote Config");
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <LoadingSpinner size="lg" text="Loading Remote Config..." />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                        Mobile App Settings
                    </h1>
                    <p className="text-neutral-600">
                        Control which features are available in the mobile application.
                        Changes are applied instantly to all connected devices.
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
                    <div className="p-6 border-b border-neutral-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-900">
                                    App Features ({draftParameters.length})
                                </h2>
                                <p className="text-sm text-neutral-500 mt-1">
                                    Toggle features on or off for the mobile application
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {hasChanges && (
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing}
                                        className="flex items-center gap-2 px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {publishing ? (
                                            <div className="animate-spin h-4 w-4 border-4 border-white border-t-transparent rounded-full"></div>
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        {publishing ? "Saving..." : "Save Changes"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {draftParameters.length === 0 ? (
                        <div className="p-12 text-center">
                            <Settings className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-neutral-900 mb-2">
                                No Settings Found
                            </h3>
                            <p className="text-neutral-600">
                                No mobile app settings are currently configured.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-200">
                            {draftParameters.map((param) => {
                                const isChanged =
                                    publishedParameters.find((p) => p.key === param.key)
                                        ?.value !== param.value;

                                const getFeatureName = (key: string) => {
                                    switch (key) {
                                        case "disable_application":
                                            return "Application Access";
                                        case "disable_audit_page":
                                            return "Audit History";
                                        case "disable_maps_page":
                                            return "Maps & Location";
                                        case "disable_home_page":
                                            return "Home Dashboard";
                                        case "disable_profile_page":
                                            return "User Profile";
                                        case "disable_scanning_page":
                                            return "QR Code Scanning";
                                        case "disable_reports_page":
                                        case "disable_reports":
                                            return "Reports";
                                        default:
                                            return key
                                                .replace(/disable_|_/g, " ")
                                                .replace(/\b\w/g, (l) => l.toUpperCase());
                                    }
                                };

                                const getFeatureDescription = (key: string) => {
                                    switch (key) {
                                        case "disable_application":
                                            return "Controls whether users can access the mobile application";
                                        case "disable_audit_page":
                                            return "Shows or hides the audit trail and history page";
                                        case "disable_maps_page":
                                            return "Controls access to maps and location tracking features";
                                        case "disable_home_page":
                                            return "Shows or hides the main dashboard and statistics";
                                        case "disable_profile_page":
                                            return "Controls access to user profile and account settings";
                                        case "disable_scanning_page":
                                            return "Enables or disables QR code scanning functionality";
                                        case "disable_reports_page":
                                        case "disable_reports":
                                            return "Controls access to reports and analytics features";
                                        default:
                                            return `Controls the ${key.replace(
                                                /disable_|_/g,
                                                " "
                                            )} feature`;
                                    }
                                };

                                return (
                                    <div
                                        key={param.key}
                                        className={`p-6 ${
                                            isChanged
                                                ? "bg-orange-50 border-l-4 border-orange-400"
                                                : ""
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-neutral-900">
                                                        {getFeatureName(param.key)}
                                                    </h3>
                                                    {isChanged && (
                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                                            Unsaved
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-neutral-600 text-sm mb-3">
                                                    {getFeatureDescription(param.key)}
                                                </p>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-neutral-500">
                                                        Status:{" "}
                                                        <span
                                                            className={
                                                                param.type === "boolean" &&
                                                                typeof param.value === "boolean"
                                                                    ? param.value
                                                                        ? "text-red-600 font-medium"
                                                                        : "text-neutral-600 font-medium"
                                                                    : "text-neutral-600 font-medium"
                                                            }
                                                        >
                                                            {param.type === "boolean" &&
                                                            typeof param.value === "boolean"
                                                                ? param.value
                                                                    ? "Disabled"
                                                                    : "Enabled"
                                                                : String(param.value)}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                {param.type === "boolean" &&
                                                typeof param.value === "boolean" ? (
                                                    <button
                                                        onClick={() =>
                                                            handleValueChange(
                                                                param.key,
                                                                !(param.value as boolean)
                                                            )
                                                        }
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                                                            (param.value as boolean)
                                                                ? "bg-red-600"
                                                                : "bg-neutral-600"
                                                        }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                (param.value as boolean)
                                                                    ? "translate-x-1"
                                                                    : "translate-x-6"
                                                            }`}
                                                        />
                                                    </button>
                                                ) : (
                                                    <span className="text-sm text-neutral-500">N/A</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}