import { useState, useEffect } from "react";
import {
  KioskService,
  type KioskHealth,
  type KioskCommand,
} from "../services/kioskService";
import {
  Activity,
  Wifi,
  WifiOff,
  Lightbulb,
  Power,
  RefreshCcw,
  Zap,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";

export function KioskMonitor() {
  const [health, setHealth] = useState<KioskHealth>({
    lastPoll: null,
    isOnline: false,
    pollCount: 0,
    uptime: 0,
    timeSinceLastPoll: null,
    serverTime: "",
  });
  const [currentCommand, setCurrentCommand] = useState<KioskCommand>({
    action: "none",
    led: 0,
    state: "off",
  });
  const [loading, setLoading] = useState(true);
  const [controlLoading, setControlLoading] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load health data
  const loadHealth = async () => {
    try {
      const healthData = await KioskService.getKioskHealth();
      console.log("[Kiosk Monitor] Health data received:", healthData);
      setHealth(healthData);

      const command = await KioskService.getCurrentCommand();
      console.log("[Kiosk Monitor] Current command:", command);
      setCurrentCommand(command);
    } catch (error) {
      console.error("Error loading kiosk health:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    loadHealth();

    if (autoRefresh) {
      const interval = setInterval(loadHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    setLoading(true);
    loadHealth();
  };

  const handleLEDControl = async (ledNumber: 1 | 2 | 3) => {
    try {
      setControlLoading(ledNumber);

      let result;
      switch (ledNumber) {
        case 1:
          result = await KioskService.controlLED1("on");
          break;
        case 2:
          result = await KioskService.controlLED2("on");
          break;
        case 3:
          result = await KioskService.controlLED3("on");
          break;
      }

      if (result.success) {
        toast.success(`LED ${ledNumber} turned on!`);
        // Refresh to see the command
        await loadHealth();
      }
    } catch (error) {
      console.error(`Error controlling LED ${ledNumber}:`, error);
      toast.error(`Failed to control LED ${ledNumber}`);
    } finally {
      setControlLoading(null);
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatLastPoll = (lastPoll: Date | null): string => {
    if (!lastPoll) return "Never";

    const now = new Date();
    const diff = Math.floor((now.getTime() - lastPoll.getTime()) / 1000);

    if (diff < 10) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastPoll.toLocaleTimeString();
  };

  const getStatusColor = (isOnline: boolean): string => {
    return isOnline ? "text-green-600" : "text-error-600";
  };

  const getStatusBgColor = (isOnline: boolean): string => {
    return isOnline ? "bg-green-100" : "bg-error-100";
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
                <Activity className="h-8 w-8 text-teal-600" />
                Kiosk Health Monitor
              </h1>
              <p className="text-neutral-600 mt-1">
                Monitor ESP32 device status and control LEDs remotely
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                />
                Auto-refresh (5s)
              </label>

              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Online Status */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-3 rounded-lg ${getStatusBgColor(
                  health.isOnline
                )}`}
              >
                {health.isOnline ? (
                  <Wifi
                    className={`h-6 w-6 ${getStatusColor(health.isOnline)}`}
                  />
                ) : (
                  <WifiOff
                    className={`h-6 w-6 ${getStatusColor(health.isOnline)}`}
                  />
                )}
              </div>
            </div>
            <h3 className="text-sm font-medium text-neutral-600 mb-1">Status</h3>
            <p
              className={`text-2xl font-bold ${getStatusColor(
                health.isOnline
              )}`}
            >
              {health.isOnline ? "Online" : "Offline"}
            </p>
          </div>

          {/* Last Poll */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg app-bg-primary-soft">
                <Clock className="h-6 w-6 app-text-primary" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-neutral-600 mb-1">
              Last Poll
            </h3>
            <p className="text-2xl font-bold text-neutral-900">
              {formatLastPoll(health.lastPoll)}
            </p>
          </div>

          {/* Poll Count */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg app-bg-primary-soft">
                <Zap className="h-6 w-6 app-text-primary" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-neutral-600 mb-1">
              Poll Count
            </h3>
            <p className="text-2xl font-bold text-neutral-900">
              {health.pollCount.toLocaleString()}
            </p>
          </div>

          {/* Uptime */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg app-bg-secondary-soft">
                <Power className="h-6 w-6 app-text-secondary" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-neutral-600 mb-1">Uptime</h3>
            <p className="text-2xl font-bold text-neutral-900">
              {formatUptime(health.uptime)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LED Control Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 app-text-secondary" />
                LED Control
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Control ESP32 LEDs remotely
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* LED 1 */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 app-bg-error-soft rounded-lg">
                    <Lightbulb className="h-5 w-5 app-text-error" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">LED 1</h3>
                    <p className="text-sm text-neutral-600">Red indicator</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLEDControl(1)}
                  disabled={controlLoading === 1}
                  className="px-4 py-2 app-bg-error text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {controlLoading === 1 ? (
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-white/50 border-t-white"></div>
                  ) : (
                    "Turn On"
                  )}
                </button>
              </div>

              {/* LED 2 */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 app-bg-success-soft rounded-lg">
                    <Lightbulb className="h-5 w-5 app-text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">LED 2</h3>
                    <p className="text-sm text-neutral-600">Green indicator</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLEDControl(2)}
                  disabled={controlLoading === 2}
                  className="px-4 py-2 app-bg-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {controlLoading === 2 ? (
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-white/50 border-t-white"></div>
                  ) : (
                    "Turn On"
                  )}
                </button>
              </div>

              {/* LED 3 */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 app-bg-primary-soft rounded-lg">
                    <Lightbulb className="h-5 w-5 app-text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">LED 3</h3>
                    <p className="text-sm text-neutral-600">Blue indicator</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLEDControl(3)}
                  disabled={controlLoading === 3}
                  className="px-4 py-2 app-bg-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {controlLoading === 3 ? (
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-white/50 border-t-white"></div>
                  ) : (
                    "Turn On"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Current Command Status */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <Zap className="h-5 w-5 app-text-primary" />
                Current Command
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Command waiting for ESP32 to poll
              </p>
            </div>

            <div className="p-6">
              <div className="bg-neutral-900 rounded-lg p-6 font-mono text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">Action:</span>
                    <span
                      className={`font-semibold ${
                        currentCommand.action === "none"
                          ? "text-neutral-400"
                          : "text-green-400"
                      }`}
                    >
                      "{currentCommand.action}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">LED:</span>
                    <span className="text-blue-400">{currentCommand.led}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">State:</span>
                    <span
                      className={`font-semibold ${
                        currentCommand.state === "on"
                          ? "text-green-400"
                          : "text-error-400"
                      }`}
                    >
                      "{currentCommand.state}"
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Activity className="h-5 w-5 app-text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold app-text-primary mb-1">
                      Polling Mechanism
                    </h4>
                    <p className="text-sm app-text-primary">
                      The ESP32 device polls the{" "}
                      <code className="app-bg-primary-soft px-1 py-0.5 rounded">
                        /kiosk/command
                      </code>{" "}
                      endpoint regularly. When you click a button above, the
                      command is set and will be executed on the next poll. The
                      command is reset to "none" after being sent to the device.
                    </p>
                  </div>
                </div>
              </div>

              {currentCommand.action !== "none" && (
                <div className="mt-4 p-4 app-bg-secondary-soft border border-[color:var(--app-secondary)]/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Zap className="h-5 w-5 app-text-secondary mt-0.5" />
                    <div>
                      <h4 className="font-semibold app-text-secondary mb-1">
                        Command Pending
                      </h4>
                      <p className="text-sm app-text-secondary">
                        A command is waiting to be picked up by the ESP32
                        device. It will be executed on the next poll.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-teal-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-teal-900 mb-1">How It Works</h3>
              <ul className="text-sm text-teal-700 space-y-1">
                <li>
                  • The ESP32 device polls the backend at regular intervals to
                  check for commands
                </li>
                <li>
                  • Health status is tracked based on polling activity (online
                  if polled within last 30 seconds)
                </li>
                <li>
                  • Click LED buttons to queue commands that will be executed on
                  the next poll
                </li>
                <li>
                  • Auto-refresh is enabled by default to show real-time status
                  updates
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-6 bg-neutral-100 border border-neutral-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-neutral-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 mb-3">
                Debug Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded p-3">
                  <span className="text-neutral-600">Last Poll Time:</span>
                  <p className="font-mono text-neutral-900 mt-1">
                    {health.lastPoll
                      ? new Date(health.lastPoll).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <span className="text-neutral-600">Time Since Last Poll:</span>
                  <p className="font-mono text-neutral-900 mt-1">
                    {health.timeSinceLastPoll !== null
                      ? `${(health.timeSinceLastPoll / 1000).toFixed(1)}s (${
                          health.timeSinceLastPoll
                        }ms)`
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <span className="text-neutral-600">Server Time:</span>
                  <p className="font-mono text-neutral-900 mt-1">
                    {health.serverTime
                      ? new Date(health.serverTime).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <span className="text-neutral-600">Online Threshold:</span>
                  <p className="font-mono text-neutral-900 mt-1">
                    30 seconds (30000ms)
                  </p>
                </div>
              </div>
              {!health.isOnline && health.timeSinceLastPoll !== null && (
                <div className="mt-3 p-3 bg-error-50 border border-error-200 rounded">
                  <p className="text-sm text-error-700">
                    Device is offline because time since last poll (
                    {(health.timeSinceLastPoll / 1000).toFixed(1)}s) exceeds 30
                    seconds threshold.
                  </p>
                </div>
              )}
              {!health.isOnline && health.lastPoll === null && (
                <div className="mt-3 p-3 bg-error-50 border border-error-200 rounded">
                  <p className="text-sm text-error-700">
                    Device has never polled the server. Make sure your ESP32 is
                    running and configured to poll{" "}
                    <code className="bg-error-100 px-1 rounded">
                      /kiosk/command
                    </code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
