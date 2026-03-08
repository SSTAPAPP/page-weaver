import { useState } from "react";
import { Plus, Edit, Trash2, Clock, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { AdminPasswordDialog } from "@/components/dialogs/AdminPasswordDialog";

export default function Services() {
  const { toast } = useToast();
  const {
    services,
    addService,
    updateService,
    deleteService,
    cardTemplates,
    addCardTemplate,
    updateCardTemplate,
    deleteCardTemplate,
  } = useStore();

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [adminPasswordDialogOpen, setAdminPasswordDialogOpen] = useState(false);
  const [adminPasswordAction, setAdminPasswordAction] = useState<"delete" | "editService" | "editCard">("delete");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "service" | "card"; id: string; name: string } | null>(null);
  const [editingService, setEditingService] = useState<typeof services[0] | null>(null);
  const [editingCard, setEditingCard] = useState<typeof cardTemplates[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Service form state
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});

  // Card template form state
  const [cardName, setCardName] = useState("");
  const [cardPrice, setCardPrice] = useState("");
  const [cardCount, setCardCount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const resetServiceForm = () => {
    setServiceName("");
    setServicePrice("");
    setServiceDuration("");
    setServiceCategory("");
    setEditingService(null);
    setServiceErrors({});
  };

  const resetCardForm = () => {
    setCardName("");
    setCardPrice("");
    setCardCount("");
    setSelectedServices([]);
    setEditingCard(null);
    setCardErrors({});
  };

  const validateServiceForm = () => {
    const errors: Record<string, string> = {};
    if (!serviceName.trim()) errors.name = "请输入服务名称";
    if (!servicePrice || parseFloat(servicePrice) <= 0) errors.price = "请输入有效价格";
    setServiceErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCardForm = () => {
    const errors: Record<string, string> = {};
    if (!cardName.trim()) errors.name = "请输入次卡名称";
    if (!cardPrice || parseFloat(cardPrice) <= 0) errors.price = "请输入有效价格";
    if (!cardCount || parseInt(cardCount) <= 0) errors.count = "请输入有效次数";
    if (selectedServices.length === 0) errors.services = "请选择至少一项关联服务";
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Pending data for password-protected edits
  const [pendingServiceData, setPendingServiceData] = useState<any>(null);
  const [pendingCardData, setPendingCardData] = useState<any>(null);

  const handleServiceSubmit = async () => {
    if (!validateServiceForm()) return;

    const data = {
      name: serviceName.trim(),
      price: parseFloat(servicePrice),
      duration: parseInt(serviceDuration) || 30,
      category: serviceCategory.trim() || "其他",
    };

    if (editingService) {
      // Editing requires admin password
      setPendingServiceData(data);
      setAdminPasswordAction("editService");
      setAdminPasswordDialogOpen(true);
    } else {
      setIsSubmitting(true);
      try {
        await new Promise((r) => setTimeout(r, 300));
        addService(data);
        toast({ title: "服务已添加" });
        resetServiceForm();
        setServiceDialogOpen(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleServiceEditConfirmed = () => {
    if (editingService && pendingServiceData) {
      updateService(editingService.id, pendingServiceData);
      toast({ title: "服务已更新" });
      resetServiceForm();
      setServiceDialogOpen(false);
      setPendingServiceData(null);
    }
  };

  const handleCardSubmit = async () => {
    if (!validateCardForm()) return;

    const data = {
      name: cardName.trim(),
      price: parseFloat(cardPrice),
      totalCount: parseInt(cardCount),
      serviceIds: selectedServices,
    };

    if (editingCard) {
      setPendingCardData(data);
      setAdminPasswordAction("editCard");
      setAdminPasswordDialogOpen(true);
    } else {
      setIsSubmitting(true);
      try {
        await new Promise((r) => setTimeout(r, 300));
        addCardTemplate(data);
        toast({ title: "次卡模板已添加" });
        resetCardForm();
        setCardDialogOpen(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCardEditConfirmed = () => {
    if (editingCard && pendingCardData) {
      updateCardTemplate(editingCard.id, pendingCardData);
      toast({ title: "次卡模板已更新" });
      resetCardForm();
      setCardDialogOpen(false);
      setPendingCardData(null);
    }
  };

  const openEditService = (service: typeof services[0]) => {
    setEditingService(service);
    setServiceName(service.name);
    setServicePrice(service.price.toString());
    setServiceDuration(service.duration.toString());
    setServiceCategory(service.category);
    setServiceErrors({});
    setServiceDialogOpen(true);
  };

  const openEditCard = (card: typeof cardTemplates[0]) => {
    setEditingCard(card);
    setCardName(card.name);
    setCardPrice(card.price.toString());
    setCardCount(card.totalCount.toString());
    setSelectedServices(card.serviceIds);
    setCardErrors({});
    setCardDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === "service") {
      deleteService(deleteTarget.id);
      toast({ title: "服务已删除" });
    } else {
      deleteCardTemplate(deleteTarget.id);
      toast({ title: "次卡模板已删除" });
    }
    
    setDeleteTarget(null);
  };

  const handleRequestDelete = (type: "service" | "card", id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setAdminPasswordAction("delete");
    setAdminPasswordDialogOpen(true);
  };

  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="服务管理"
        description="维护服务项目与次卡模板，设置价格、时长和适用范围"
      />

      <Tabs defaultValue="services">
        <TabsList className="grid w-full grid-cols-2 lg:w-80">
          <TabsTrigger value="services">服务项目</TabsTrigger>
          <TabsTrigger value="cards">次卡模板</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetServiceForm();
                setServiceDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加服务
            </Button>
          </div>

          {services.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="暂无服务项目"
              description="添加服务项目后可在收银台使用"
              action={
                <Button onClick={() => { resetServiceForm(); setServiceDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加服务
                </Button>
              }
            />
          ) : (
            categories.map((category) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {category}
                    <Badge variant="secondary" className="font-normal">
                      {services.filter((s) => s.category === category).length}项
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {services
                      .filter((s) => s.category === category)
                      .map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                        >
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />¥{service.price}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {service.duration}分钟
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => openEditService(service)}
                              aria-label={`编辑${service.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => handleRequestDelete("service", service.id, service.name)}
                              aria-label={`删除${service.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="cards" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetCardForm();
                setCardDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加次卡模板
            </Button>
          </div>

          {cardTemplates.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="暂无次卡模板"
              description="创建次卡模板后可以销售给会员"
              action={
                <Button onClick={() => { resetCardForm(); setCardDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加次卡模板
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cardTemplates.map((template) => {
                const unitPrice = template.totalCount > 0 ? (template.price / template.totalCount) : 0;
                const serviceNames = template.serviceIds
                  .map(sid => services.find(s => s.id === sid)?.name)
                  .filter(Boolean);
                
                return (
                  <div
                    key={template.id}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                  >
                    {/* 顶部装饰条 */}
                    <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
                    
                    <div className="p-4">
                      {/* 头部：名称 + 操作 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <CreditCard className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight">{template.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              均价 ¥{unitPrice.toFixed(1)}/次
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditCard(template)}
                            aria-label={`编辑${template.name}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRequestDelete("card", template.id, template.name)}
                            aria-label={`删除${template.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* 核心数据 */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">售价</p>
                          <p className="text-lg font-bold tabular-nums mt-0.5">¥{template.price}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground leading-tight">总次数</p>
                          <p className="text-lg font-bold tabular-nums mt-0.5">{template.totalCount}<span className="text-xs font-normal text-muted-foreground ml-0.5">次</span></p>
                        </div>
                      </div>

                      {/* 适用服务 */}
                      {serviceNames.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1.5">适用服务</p>
                          <div className="flex flex-wrap gap-1">
                            {serviceNames.slice(0, 4).map((name, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                {name}
                              </Badge>
                            ))}
                            {serviceNames.length > 4 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                                +{serviceNames.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "编辑服务" : "添加服务"}</DialogTitle>
            <DialogDescription>
              {editingService ? "修改服务项目信息" : "创建新的服务项目"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="服务名称"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="如：洗剪吹"
              error={serviceErrors.name}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="价格"
                required
                type="number"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                placeholder="38"
                error={serviceErrors.price}
              />
              <FormField
                label="时长(分钟)"
                type="number"
                value={serviceDuration}
                onChange={(e) => setServiceDuration(e.target.value)}
                placeholder="30"
              />
            </div>
            <FormField
              label="分类"
              value={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
              placeholder="如：剪发、烫染"
              hint='留空将归类为"其他"'
            />
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setServiceDialogOpen(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <LoadingButton
                className="flex-1"
                onClick={handleServiceSubmit}
                loading={isSubmitting}
              >
                确认
              </LoadingButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Template Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? "编辑次卡模板" : "添加次卡模板"}</DialogTitle>
            <DialogDescription>
              {editingCard ? "修改次卡模板信息" : "创建新的次卡模板"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="次卡名称"
              required
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="如：洗剪吹10次卡"
              error={cardErrors.name}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="售价"
                required
                type="number"
                value={cardPrice}
                onChange={(e) => setCardPrice(e.target.value)}
                placeholder="280"
                error={cardErrors.price}
              />
              <FormField
                label="次数"
                required
                type="number"
                value={cardCount}
                onChange={(e) => setCardCount(e.target.value)}
                placeholder="10"
                error={cardErrors.count}
              />
            </div>
            <div className="space-y-2">
              <Label className={cardErrors.services ? "text-destructive" : ""}>
                关联服务 <span className="text-destructive">*</span>
              </Label>
              <ScrollArea className="h-40 rounded-lg border border-border p-3">
                <div className="space-y-2">
                  {services.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      请先添加服务项目
                    </p>
                  ) : (
                    services.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={(checked) => {
                            setSelectedServices(
                              checked
                                ? [...selectedServices, service.id]
                                : selectedServices.filter((id) => id !== service.id)
                            );
                          }}
                        />
                        <label htmlFor={`service-${service.id}`} className="text-sm">
                          {service.name} - ¥{service.price}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              {cardErrors.services && (
                <p className="text-sm text-destructive">{cardErrors.services}</p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCardDialogOpen(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <LoadingButton
                className="flex-1"
                onClick={handleCardSubmit}
                loading={isSubmitting}
              >
                确认
              </LoadingButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Password Dialog */}
      <AdminPasswordDialog
        open={adminPasswordDialogOpen}
        onOpenChange={setAdminPasswordDialogOpen}
        onConfirm={() => {
          if (adminPasswordAction === "delete") handleDelete();
          else if (adminPasswordAction === "editService") handleServiceEditConfirmed();
          else if (adminPasswordAction === "editCard") handleCardEditConfirmed();
        }}
        title={
          adminPasswordAction === "delete"
            ? `删除${deleteTarget?.type === "service" ? "服务" : "次卡模板"}`
            : adminPasswordAction === "editService"
            ? "修改服务项目"
            : "修改次卡模板"
        }
        description={
          adminPasswordAction === "delete"
            ? `确定要删除"${deleteTarget?.name}"吗？此操作不可恢复。请输入管理员密码确认。`
            : "修改操作需要管理员密码确认"
        }
      />
    </div>
  );
}