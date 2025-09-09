import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import {
  Calendar,
  Clock,
  User,
  Video,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { getMySessions, cancelSession } from "@/services/api";
import { ClassSession } from "@/types";

const StudentSessions = () => {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "completed" | "cancelled"
  >("upcoming");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await getMySessions();
      setSessions(response.data.data || []);
      console.log("Fetched sessions:", response.data.data);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to fetch sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to cancel this session? This action cannot be undone.")) {
      return;
    }

    try {
      setCancellingSessionId(sessionId);
      await cancelSession(sessionId);
      
      toast({
        title: "Session Cancelled",
        description: "Your session has been cancelled successfully.",
      });
      
      // Refresh sessions
      await fetchSessions();
    } catch (error: any) {
      console.error("Error cancelling session:", error);
      toast({
        title: "Cancellation Failed",
        description:
          error.response?.data?.message || "Failed to cancel session",
        variant: "destructive",
      });
    } finally {
      setCancellingSessionId(null);
    }
  };

  const formatDuration = (duration: string | number | undefined): string => {
    if (!duration) return "";
    const num =
      typeof duration === "string" ? parseInt(duration, 10) : duration;
    return `${num} minutes`;
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short", // "Dec"
      day: "2-digit", // "12"
      year: "numeric", // "2025"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "booked":
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "booked":
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "upcoming") {
      return (
        (session.status === "booked" || session.status === "approved") &&
        (session.type === "admin_created" || session.type === "slot_request")
      );
    }
    if (activeTab === "completed") return session.status === "completed";
    if (activeTab === "cancelled") return session.status === "cancelled";
    return false;
  });

  const SessionCard = ({ session }: { session: ClassSession }) => {
    const isUpcoming = session.status === "booked" || session.status === "approved";
    const sessionDateTime = new Date(session.date);
    const now = new Date();
    const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const canCancel = isUpcoming && hoursUntilSession >= 24;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(session.status)}
              <div>
                <CardTitle className="text-lg">{session.subject}</CardTitle>
                <CardDescription>
                  with {session.tutorName}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(session.date)}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                {formatTime(session.time)} ({formatDuration(session.duration)})
              </span>
            </div>
            {session.meetingLink && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Video className="h-4 w-4" />
                <span>Meeting link available</span>
              </div>
            )}
            {session.description && (
              <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                {session.description}
              </p>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {isUpcoming && session.meetingLink && (
              <Button
                className="w-full"
                onClick={() => window.open(session.meetingLink, "_blank")}
              >
                <Video className="h-4 w-4 mr-2" />
                Join Class
              </Button>
            )}
            
            {canCancel && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCancelSession(session.id || session._id)}
                disabled={cancellingSessionId === (session.id || session._id)}
              >
                {cancellingSessionId === (session.id || session._id) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Session
                  </>
                )}
              </Button>
            )}
            
            {isUpcoming && !canCancel && hoursUntilSession < 24 && (
              <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded">
                Cancellation not available within 24 hours of session
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your sessions...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">My Sessions</h1>
          <p className="text-gray-600">
            View and manage your learning sessions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {sessions.filter((s) => s.status === "booked").length}
              </div>
              <p className="text-xs text-muted-foreground">Next classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {sessions.filter((s) => s.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Finished classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <p className="text-xs text-muted-foreground">All sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={activeTab === "upcoming" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("upcoming")}
            className="flex-1"
          >
            Upcoming ({sessions.filter((s) => s.status === "booked").length})
          </Button>
          <Button
            variant={activeTab === "completed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("completed")}
            className="flex-1"
          >
            Completed ({sessions.filter((s) => s.status === "completed").length}
            )
          </Button>
          <Button
            variant={activeTab === "cancelled" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("cancelled")}
            className="flex-1"
          >
            Cancelled ({sessions.filter((s) => s.status === "cancelled").length}
            )
          </Button>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500">
                  {activeTab === "upcoming" && (
                    <>
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">
                        No upcoming sessions
                      </h3>
                      <p>You don't have any upcoming classes scheduled.</p>
                    </>
                  )}
                  {activeTab === "completed" && (
                    <>
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">
                        No completed sessions
                      </h3>
                      <p>You haven't completed any classes yet.</p>
                    </>
                  )}
                  {activeTab === "cancelled" && (
                    <>
                      <XCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">
                        No cancelled sessions
                      </h3>
                      <p>You don't have any cancelled classes.</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentSessions;
