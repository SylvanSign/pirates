defmodule Pirates.GameServer.Manager do
    @moduledoc """
    Routes to game server instances and cleans up after them
    """
    require Logger
    use GenServer
    alias Pirates.GameServer.Instance

    @name __MODULE__
    @max_players_per_server 2

  ##############
  # Client API #
  ##############

    def start_link do
        GenServer.start_link(@name, :ok, name: @name)
    end

    def next_available_server do
        GenServer.call(@name, :next)
    end

    def get_or_create_instance(name) do
        GenServer.call(@name, {:get, name})
    end

  ####################
  # Server Callbacks #
  ####################

  def init(:ok) do
      servers = Map.new()
      {:ok, servers}
  end

  def handle_call(:next, _from, servers) do
      Logger.info("yo!")
    {name, _} = 
        servers 
        |> Enum.filter(fn ({_, i}) -> count(i) < @max_players_per_server end) 
        |> Enum.min_by(fn ({_, i}) -> count(i) end, fn -> {System.unique_integer([:positive]), nil} end)
    {:reply, {:ok, name}, servers}
  end

  def handle_call({:get, name}, _from, servers) do
    if (Map.has_key?(servers, name)) do
         {:reply, Map.get(servers, name), servers}
    else
        instance = create_instance(name)
        {:reply, instance, Map.put(servers, name, instance)}
    end
  end

  # handle dropped servers
  def handle_info({:DOWN, _ref, :process, instance, _reason}, servers) do
      # todo: better structure than map?
      name = 
        servers
        |> Enum.find(fn ({_, i}) -> i == instance end)
        |> elem(0)
    {:noreply, Map.delete(servers, name)}
  end

  defp count(instance) do
      instance |> Instance.table |> Instance.count
  end

  defp create_instance(name) do
    {:ok, instance} = Supervisor.start_child(Pirates.GameServer.Factory, [name])
    Process.monitor(instance)
    Logger.info("created instance: #{inspect(instance)}")
    instance
  end

end
