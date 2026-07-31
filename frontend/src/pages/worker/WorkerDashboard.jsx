import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { inspectionAPI } from "../../services/api";
import StatCard from "../../components/StatCard";
import { SeverityBadge, StatusBadge } from "../../components/SeverityBadge";
import DefectBadge from "../../components/DefectBadge";
import { QualityScoreInline } from "../../components/QualityScoreMeter";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";
import {
  Upload, History, CheckCircle, Clock, XCircle,
  AlertTriangle, ArrowRight, RefreshCw, Eye,
  Award, TrendingUp, Calendar,
} from "lucide-react";

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        inspectionAPI.workerSummary(),
        inspectionAPI.history({ per_page: 5 }),
      ]);
      setSummary(summaryRes.data.data);
      setRecent(historyRes.data.data?.inspections || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="page-subtitle">Your quality inspection overview</p>
        </div>
        <button onClick={fetchData} className="btn-secondary !px-3 !py-2" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchData} /></div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Loading dashboard…" />
        </div>
      ) : (
        <>
          {/* Today's stats */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400 font-medium">Today</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Today's Inspections" value={summary?.today?.total} icon={TrendingUp} color="blue" />
              <StatCard title="Pending" value={summary?.today?.pending} icon={Clock} color="yellow" />
              <StatCard title="Approved" value={summary?.today?.approved} icon={CheckCircle} color="green" />
              <StatCard title="Rejected" value={summary?.today?.rejected} icon={XCircle} color="red" />
            </div>
          </div>

          {/* All-time + quality score */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-4">
            <StatCard title="Total Inspections" value={summary?.all_time?.total} icon={History} color="blue" />
            <StatCard title="Total Approved" value={summary?.all_time?.approved} icon={CheckCircle} color="green" />
            <StatCard title="Total Rejected" value={summary?.all_time?.rejected} icon={XCircle} color="red" />
            <StatCard
              title="Avg Quality Score"
              value={summary?.avg_quality_score ? `${summary.avg_quality_score}/100` : "—"}
              icon={Award}
              color="purple"
              subtitle="Across all inspections"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link to="/worker/inspect"
              className="card flex items-center gap-4 hover:border-blue-600 transition-all group cursor-pointer">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center
                              group-hover:bg-blue-600/30 transition-colors border border-blue-800">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">New Inspection</p>
                <p className="text-slate-400 text-sm">Upload image and run AI detection</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </Link>

            <Link to="/worker/history"
              className="card flex items-center gap-4 hover:border-slate-500 transition-all group cursor-pointer">
              <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center
                              group-hover:bg-slate-600 transition-colors border border-slate-600">
                <History className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Inspection History</p>
                <p className="text-slate-400 text-sm">View all past inspections and status</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </Link>
          </div>

          {/* Recent inspections */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Recent Inspections</h2>
              <Link to="/worker/history"
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState title="No inspections yet"
                description="Start by uploading a product image for AI inspection."
                icon={Upload} />
            ) : (
              <div className="space-y-2">
                {recent.map((ins) => (
                  <RecentRow key={ins.id} inspection={ins} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RecentRow({ inspection: ins }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg
                    hover:bg-slate-700/50 transition-colors border border-slate-700/50">
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 border border-slate-600">
        {ins.original_image ? (
          <img src={inspectionAPI.imageUrl(ins.original_image)} alt="product"
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Eye className="w-4 h-4 text-slate-500" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white truncate">
            {ins.product?.product_name || `Product #${ins.product_id}`}
          </p>
          {ins.is_recurring && (
            <span className="flex items-center gap-1 text-xs text-orange-400">
              <AlertTriangle className="w-3 h-3" />Recurring
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-xs text-slate-500">{new Date(ins.created_at).toLocaleString()}</p>
          {ins.quality_score != null && (
            <QualityScoreInline score={ins.quality_score} label={ins.quality_label} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <DefectBadge defect={ins.defect} />
        <StatusBadge status={ins.status} />
      </div>
    </div>
  );
}
